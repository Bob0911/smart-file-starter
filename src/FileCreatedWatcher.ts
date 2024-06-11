import { FileSystemWatcher, WorkspaceFolder, workspace } from "vscode";
import vscode from "vscode";
import path from "path";
import fs from "fs/promises";
import Mustache from "mustache";
import { minimatch } from "minimatch";
type Template = {
  name: string;
  content: string;
  pattern?: string;
  regex?: string;
};
const configuration = workspace.getConfiguration("namespaceStarter");
const userTemplates = configuration.get<Template[]>("templates");
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
    this.fileWatcher.onDidCreate(async (uri) => {
      if ((await fs.stat(uri.fsPath)).size === 0) {
        this.onCreate(uri.fsPath);
      }
    });
  }
  public unregister() {
    this.fileWatcher?.dispose();
  }
  public async findProjectFile(filePath: string) {
    for (const root of this.workspaceFolders) {
      const rootPath = root.uri.fsPath;
      const relativePath = path.dirname(path.relative(rootPath, filePath));
      //find .csproj file inside root start from relativePath
      let currentPath = relativePath;
      while (currentPath !== path.dirname(currentPath)) {
        const files = await fs.readdir(path.join(rootPath, currentPath));
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
    const namespaceParts = relativePath
      .split(path.sep)
      .filter((part) => part.length > 0);
    return [path.basename(projectFilePath, ".csproj"), ...namespaceParts].join(
      "."
    );
  }
  public async onCreate(uri: string) {
    const projectFilePath = await this.findProjectFile(uri);
    if (projectFilePath) {
      const namespace = this.calculateNamespace(projectFilePath, uri);
      this.writeContent(uri, namespace);
    }
  }
  public async writeContent(filePath: string, namespace: string) {
    let content = "namespace {{namespace}};";
    const template = userTemplates?.find(
      (e) =>
        (e.pattern && minimatch(filePath, e.pattern)) ||
        (e.regex && new RegExp(e.regex).test(filePath))
    );
    if (template) {
      console.log(`use template name: ${template.name} from configuration`);
      content = template.content;
    }
    await fs.writeFile(
      filePath,
      Mustache.render(content, {
        namespace,
        filename: path.basename(filePath, ".cs"),
      })
    );
  }
}
