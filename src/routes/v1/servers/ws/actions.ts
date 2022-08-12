export enum MCSVClientV1Actions {
  PING = 'ping',
  RUN_COMMAND = 'run_command',
  RUN_SHELL_COMMAND = 'run_shell_command',
  GET_SERVER_METADATA = 'get_server_metadata',
  GET_SERVER_PERFORMANCE = 'get_server_performance',
  GET_PLAYERS = 'get_players',
  GET_PLUGIN_VERSION = 'get_plugin_version',
  GET_BUKKIT_VERSION = 'get_bukkit_version',
  GET_BUKKIT_INFO = 'get_bukkit_info',
}

export enum MCSVRunCommandRejection {
  COMMAND_TIMEOUT = 'command_timeout',
}
