import { FileSystemWatcher, WorkspaceFolder } from "vscode";
import vscode from "vscode";
import path from "path";
import { readdirSync, writeFile, writeFileSync } from "fs";
export enum FileType {
  Interface,
  Class,
  Record,
  Controller,
  Command,
  Query,
}
export class FileCreatedWatcher {
  private fileWatcher: FileSystemWatcher | undefined;
  private workspaceFolders: Readonly<WorkspaceFolder[]>;
  constructor(workspaceFolders: Readonly<WorkspaceFolder[]>) {
    this.workspaceFolders = workspaceFolders;
  }
  public register() {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.cs",
      false,
      true,
      true
    );
    this.fileWatcher.onDidCreate((uri) => {
      this.onCreate(uri.fsPath);
    });
  }
  public unregister() {
    this.fileWatcher?.dispose();
  }
  public findProjectFile(filePath: string) {
    for (const root of this.workspaceFolders) {
      const rootPath = root.uri.fsPath;
      const relativePath = path.dirname(path.relative(rootPath, filePath));
      //find .csproj file inside root start from relativePath
      let currentPath = relativePath;
      while (currentPath !== path.dirname(currentPath)) {
        const files = readdirSync(path.join(rootPath, currentPath));
        for (const file of files) {
          if (file.endsWith(".csproj")) {
            return path.join(rootPath, currentPath, file);
          }
        }
        currentPath = path.dirname(currentPath);
      }
    }
    return null;
  }
  public calculateNamespace(projectFilePath: string, newFilePath: string) {
    const relativePath = path.relative(
      path.dirname(projectFilePath),
      path.dirname(newFilePath)
    );
    console.log("relativePath", relativePath);
    const namespaceParts = relativePath
      .split(path.sep)
      .filter((part) => part.length > 0);
    return [path.basename(projectFilePath, ".csproj"), ...namespaceParts].join(
      "."
    );
  }
  public getFileType(uri: string) {
    const fileName = path.basename(uri, ".cs");

    if (
      fileName.length >= 2 &&
      fileName[0] === "I" &&
      fileName[1] === fileName[1].toUpperCase()
    ) {
      return FileType.Interface;
    } else if (fileName.endsWith("Controller")) {
      return FileType.Controller;
    } else if (fileName.endsWith("Command")) {
      return FileType.Command;
    } else if (fileName.endsWith("Query")) {
      return FileType.Query;
    } else if (fileName.endsWith("Request") || fileName.endsWith("Response")) {
      return FileType.Record;
    }
    return FileType.Class;
  }
  public onCreate(uri: string) {
    const projectFilePath = this.findProjectFile(uri);
    if (projectFilePath) {
      const namespace = this.calculateNamespace(projectFilePath, uri);
      const fileType = this.getFileType(uri);
      this.writeContent(uri, fileType, namespace);
    }
  }
  public writeContent(filePath: string, fileType: FileType, namespace: string) {
    const input: Array<string> = [];
    const name = path.basename(filePath,".cs");
    input.push(`namespace ${namespace};`);
    if (fileType === FileType.Controller) {
        input.push(`public class ${name} : ApiController\n{\n}`);
    }
    writeFileSync(filePath,input.join("\n"));
    vscode.window.showInformationMessage("😊 auto write file start content");
  }
}
