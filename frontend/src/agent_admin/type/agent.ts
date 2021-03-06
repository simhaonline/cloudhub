export interface GetAgentDirectoryInfo {
  data: {return: string[]}
  status: number
  statusText: string
}

export interface AgentDirFileInfo {
  updateTime?: string
  updateGetTime?: number
  application?: string
  applicationFullName?: string
  pathDirectory?: string
  fullPathDirectory?: string
}

export interface AgentDirFile {
  files: AgentDirFileInfo[]
  isLoading?: boolean
  status?: string | GetAgentDirectoryInfo
}
