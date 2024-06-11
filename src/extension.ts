// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { FileCreatedWatcher } from "./FileCreatedWatcher";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
let watcher: FileCreatedWatcher | undefined;
export function activate(context: vscode.ExtensionContext) {
  console.log("🤞 Extension Activited!");
  if (vscode.workspace.workspaceFolders?.length) {
    watcher = new FileCreatedWatcher(vscode.workspace.workspaceFolders);
    watcher.register();
  }
}
// This method is called when your extension is deactivated
export function deactivate() {
  console.log("👉👈 Extension Deactivited!");
  watcher?.unregister();
}
