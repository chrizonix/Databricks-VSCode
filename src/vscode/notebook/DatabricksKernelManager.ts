import * as vscode from 'vscode';

import { ThisExtension } from '../../ThisExtension';
import { ContextLanguage, ExecutionContext } from '../../databricksApi/_types';
import { DatabricksApiService } from '../../databricksApi/databricksApiService';
import { Helper } from '../../helpers/Helper';
import { iDatabricksCluster } from '../treeviews/clusters/iDatabricksCluster';
import { DatabricksKernel } from './DatabricksKernel';


export abstract class DatabricksKernelManager {
	private static NotebookKernelSuffix: string = "-jupyter-notebook";
	private static InteractiveKernelSuffix: string = "-interactive";

	private static _kernels: Map<string, DatabricksKernel> = new Map<string, DatabricksKernel>();

	static async initialize(): Promise<void> {
		this.refresh();
		this.autoRefresh(30);
	}

	static async refresh(showInfoMessage: boolean = false): Promise<void> {
		let clusters: iDatabricksCluster[] = await DatabricksApiService.listClusters();

		for (let cluster of clusters) {
			if (cluster.cluster_source != "JOB") {
				if (cluster.state == "RUNNING") {
					DatabricksKernelManager.createKernels(cluster, showInfoMessage);
				}
				else {
					DatabricksKernelManager.removeKernels(cluster, showInfoMessage);
				}
			}
		}
	}

	static async autoRefresh(timeoutSeconds: number = 10) {
		while (true) {
			await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000));

			this.refresh(false);
		}
	}

	static setKernel(kernelName: string, kernel: DatabricksKernel): void {
		if (!this._kernels.has(kernelName)) {
			this._kernels.set(kernelName, kernel);
		}
	}

	static removeKernel(kernelName: string): void {
		if (this._kernels.has(kernelName)) {
			let kernel: DatabricksKernel = this.getKernel(kernelName);
			kernel.dispose();
		}
	}

	static getKernel(kernelName: string): DatabricksKernel {
		return this._kernels.get(kernelName);
	}

	static getNotebookKernelName(cluster: iDatabricksCluster): string {
		return cluster.cluster_id + DatabricksKernelManager.NotebookKernelSuffix;
	}

	static getNotebookKernel(cluster: iDatabricksCluster): DatabricksKernel {
		return this.getKernel(this.getNotebookKernelName(cluster));
	}

	static notebookKernelExists(cluster: iDatabricksCluster): boolean {
		if (this.getKernel(this.getNotebookKernelName(cluster))) {
			return true;
		}
		return false;
	}

	static getInteractiveKernelName(cluster: iDatabricksCluster): string {
		return cluster.cluster_id + DatabricksKernelManager.InteractiveKernelSuffix
	}

	static getInteractiveKernel(cluster: iDatabricksCluster): DatabricksKernel {
		return this.getKernel(this.getInteractiveKernelName(cluster));
	}

	static interactiveKernelExists(cluster: iDatabricksCluster): boolean {
		if (this.getInteractiveKernel(cluster)) {
			return true;
		}
		return false;
	}

	static async createKernels(cluster: iDatabricksCluster, logMessages: boolean = true): Promise<void> {
		if (!this.notebookKernelExists(cluster)) {
			let notebookKernel: DatabricksKernel = new DatabricksKernel(cluster.cluster_id, cluster.cluster_name);
			this.setKernel(this.getNotebookKernelName(cluster), notebookKernel);
			if (logMessages) {
				ThisExtension.log(`Notebook Kernel for Databricks cluster '${cluster.cluster_id}' created!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.log(`Notebook Kernel for Databricks cluster '${cluster.cluster_id}' already exists!`)
			}
		}

		if (!this.interactiveKernelExists(cluster)) {
			let interactiveKernel: DatabricksKernel = new DatabricksKernel(cluster.cluster_id, cluster.cluster_name, "interactive");
			this.setKernel(this.getInteractiveKernelName(cluster), interactiveKernel);
			if (logMessages) {
				ThisExtension.log(`Interactive Kernel for Databricks cluster '${cluster.cluster_id}' created!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.log(`Interactive Kernel for Databricks cluster '${cluster.cluster_id}' already exists!`)
			}
		}
	}

	static async removeKernels(cluster: iDatabricksCluster, logMessages: boolean = true): Promise<void> {
		if (this.notebookKernelExists(cluster)) {
			this.removeKernel(this.getNotebookKernelName(cluster));
			if (logMessages) {
				ThisExtension.log(`Notebook Kernel for Databricks cluster '${cluster.cluster_id}' removed!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.log(`Notebook Kernel for Databricks cluster '${cluster.cluster_id}' does not exists!`)
			}
		}

		if (this.interactiveKernelExists(cluster)) {
			this.removeKernel(this.getInteractiveKernelName(cluster));
			if (logMessages) {
				ThisExtension.log(`Interactive Kernel for Databricks cluster '${cluster.cluster_id}' removed!`)
			}
		}
		else {
			if (logMessages) {
				ThisExtension.log(`Interactive Kernel for Databricks cluster '${cluster.cluster_id}' does not exists!`)
			}
		}
	}

	static async restartNotebookKernel(cluster: iDatabricksCluster): Promise<void> {
		let kernel: DatabricksKernel = this.getNotebookKernel(cluster)
		if (kernel) {
			kernel.restart();
		}
	}
}