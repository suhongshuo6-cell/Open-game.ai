import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AgentEvent,
  AppSettings,
  ApprovalAnswers,
  ApprovalDecision,
  ApprovalRequest,
  AssetPlanRecord,
  BootstrapPayload,
  CreateProjectInput,
  EnvironmentStatusSnapshot,
  FileReadResult,
  GameAssetRecord,
  GameplayExperienceReport,
  ExtensionSettingsSnapshot,
  LoginStartResult,
  McpServerSetting,
  MediaCapability,
  MediaProviderSetting,
  MediaProviderTestResult,
  OpenGameCrewMember,
  OpenGamePackId,
  OpenGameApi,
  PromptTemplateId,
  PromptTemplateSetting,
  ProjectInspectorPayload,
  ProjectIconData,
  ProjectRecord,
  RunProjectInput,
  RuntimeStatus,
  SaveMcpServerInput,
  SaveMediaProviderInput,
  SkillSetting,
} from '../shared/contracts.js';

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api: OpenGameApi = {
  bootstrap: () => ipcRenderer.invoke('opengame:bootstrap') as Promise<BootstrapPayload>,
  refreshRuntime: () => ipcRenderer.invoke('opengame:runtime:refresh') as Promise<RuntimeStatus>,
  startLogin: () => ipcRenderer.invoke('opengame:runtime:login') as Promise<LoginStartResult>,
  logout: () => ipcRenderer.invoke('opengame:runtime:logout') as Promise<RuntimeStatus>,
  chooseDirectory: () => ipcRenderer.invoke('opengame:dialog:directory') as Promise<string | null>,
  chooseProjectDirectory: () =>
    ipcRenderer.invoke('opengame:dialog:project-directory') as Promise<string | null>,
  createProject: (input: CreateProjectInput, files: readonly unknown[] = []) => {
    if (!Array.isArray(files) || files.length > 50) {
      return Promise.reject(new Error('一次最多上传 50 个附件'));
    }
    let paths: string[];
    try {
      paths = files.map((file) => webUtils.getPathForFile(file as File)).filter(Boolean);
    } catch {
      return Promise.reject(new Error('无法读取上传文件的本地路径'));
    }
    if (paths.length !== files.length) return Promise.reject(new Error('上传文件缺少本地路径'));
    return ipcRenderer.invoke('opengame:project:create', input, paths) as Promise<ProjectRecord>;
  },
  renameProject: (projectId: string, name: string) =>
    ipcRenderer.invoke('opengame:project:rename', projectId, name) as Promise<ProjectRecord>,
  setProjectPinned: (projectId: string, pinned: boolean) =>
    ipcRenderer.invoke('opengame:project:pin', projectId, pinned) as Promise<ProjectRecord>,
  deleteProject: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:delete', projectId) as Promise<ProjectRecord>,
  runProject: (input: RunProjectInput) =>
    ipcRenderer.invoke('opengame:project:run', input) as Promise<ProjectRecord>,
  stopProject: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:stop', projectId) as Promise<ProjectRecord>,
  revealProject: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:reveal', projectId) as Promise<ProjectRecord | null>,
  importProjectAssets: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:assets:import', projectId) as Promise<GameAssetRecord[]>,
  importDroppedProjectAssets: (projectId: string, files: readonly unknown[]) => {
    if (!Array.isArray(files) || files.length === 0 || files.length > 50) {
      return Promise.reject(new Error('一次只能拖入 1–50 张图片'));
    }
    let paths: string[];
    try {
      paths = files.map((file) => webUtils.getPathForFile(file as File)).filter(Boolean);
    } catch {
      return Promise.reject(new Error('无法读取拖入文件的本地路径'));
    }
    if (paths.length !== files.length) return Promise.reject(new Error('拖入文件缺少本地路径'));
    return ipcRenderer.invoke('opengame:project:assets:import-paths', projectId, paths) as Promise<GameAssetRecord[]>;
  },
  retryAssetPlan: (projectId: string, planId: string) =>
    ipcRenderer.invoke('opengame:project:asset-plan:retry', projectId, planId) as Promise<AssetPlanRecord>,
  inspectProject: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:inspect', projectId) as Promise<ProjectInspectorPayload>,
  evaluateProjectExperience: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:experience:evaluate', projectId) as Promise<GameplayExperienceReport>,
  cancelProjectExperience: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:experience:cancel', projectId) as Promise<void>,
  readProjectFile: (projectId: string, relativePath: string) =>
    ipcRenderer.invoke('opengame:project:read', projectId, relativePath) as Promise<FileReadResult>,
  getProjectIcon: (projectId: string) =>
    ipcRenderer.invoke('opengame:project:icon', projectId) as Promise<ProjectIconData | null>,
  saveProjectOpenGamePack: (projectId: string, packId: OpenGamePackId | null) =>
    ipcRenderer.invoke('opengame:project:opengame-pack:save', projectId, packId) as Promise<ProjectRecord>,
  saveProjectOpenGameCrew: (projectId: string, crew: readonly OpenGameCrewMember[] | null) =>
    ipcRenderer.invoke('opengame:project:opengame-crew:save', projectId, crew) as Promise<ProjectRecord>,
  saveSettings: (patch: Partial<AppSettings>) =>
    ipcRenderer.invoke('opengame:settings:save', patch) as Promise<AppSettings>,
  getEnvironmentStatus: () =>
    ipcRenderer.invoke('opengame:environment:get') as Promise<EnvironmentStatusSnapshot>,
  refreshEnvironmentStatus: () =>
    ipcRenderer.invoke('opengame:environment:refresh') as Promise<EnvironmentStatusSnapshot>,
  chooseGodotExecutable: () =>
    ipcRenderer.invoke('opengame:environment:godot:choose') as Promise<string | null>,
  saveGodotExecutable: (binaryPath: string | null) =>
    ipcRenderer.invoke('opengame:environment:godot:save', binaryPath) as Promise<EnvironmentStatusSnapshot>,
  getExtensionSettings: () =>
    ipcRenderer.invoke('opengame:extensions:get') as Promise<ExtensionSettingsSnapshot>,
  saveMediaProvider: (input: SaveMediaProviderInput) =>
    ipcRenderer.invoke('opengame:media-provider:save', input) as Promise<MediaProviderSetting>,
  testMediaProvider: (capability: MediaCapability) =>
    ipcRenderer.invoke('opengame:media-provider:test', capability) as Promise<MediaProviderTestResult>,
  listSkills: () => ipcRenderer.invoke('opengame:skills:list') as Promise<SkillSetting[]>,
  setSkillEnabled: (input: { id: string; enabled: boolean }) =>
    ipcRenderer.invoke('opengame:skills:set-enabled', input) as Promise<SkillSetting>,
  listMcpServers: () => ipcRenderer.invoke('opengame:mcp:list') as Promise<McpServerSetting[]>,
  saveMcpServer: (input: SaveMcpServerInput) =>
    ipcRenderer.invoke('opengame:mcp:save', input) as Promise<McpServerSetting>,
  removeMcpServer: (id: string) => ipcRenderer.invoke('opengame:mcp:remove', id) as Promise<void>,
  listPromptTemplates: () =>
    ipcRenderer.invoke('opengame:prompts:list') as Promise<PromptTemplateSetting[]>,
  savePromptTemplate: (input: { id: PromptTemplateId; content: string; enabled: boolean }) =>
    ipcRenderer.invoke('opengame:prompts:save', input) as Promise<PromptTemplateSetting>,
  resetPromptTemplate: (id: PromptTemplateId) =>
    ipcRenderer.invoke('opengame:prompts:reset', id) as Promise<PromptTemplateSetting>,
  resolveApproval: (token: string, decision: ApprovalDecision, answers?: ApprovalAnswers) =>
    ipcRenderer.invoke('opengame:approval:resolve', token, decision, answers) as Promise<void>,
  onAgentEvent: (listener: (event: AgentEvent) => void) =>
    subscribe('opengame:event:agent', listener),
  onProjectChanged: (listener: (project: ProjectRecord) => void) =>
    subscribe('opengame:event:project', listener),
  onRuntimeChanged: (listener: (status: RuntimeStatus) => void) =>
    subscribe('opengame:event:runtime', listener),
  onApproval: (listener: (approval: ApprovalRequest) => void) =>
    subscribe('opengame:event:approval', listener),
  onApprovalClosed: (listener: (token: string) => void) =>
    subscribe('opengame:event:approval-closed', listener),
  onAssetsChanged: (listener: (payload: { projectId: string; assets: GameAssetRecord[] }) => void) =>
    subscribe('opengame:event:assets', listener),
  onAssetPlansChanged: (listener: (payload: { projectId: string; assetPlans: AssetPlanRecord[] }) => void) =>
    subscribe('opengame:event:asset-plans', listener),
};

contextBridge.exposeInMainWorld('opengame', Object.freeze(api));
