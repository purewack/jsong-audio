import { VerboseLevel } from "./types/player";

export default class Logger {
  level: VerboseLevel;
  VERBOSE_LEVELS: { [key: string]: number } = {
    'warning': 1,
    'info': 2,
    'all': 3
  };

  constructor(level?: VerboseLevel){
    this.level = level || null;
  }

  error(er: Error) {
    console.error(er);
  }

  warning(...message: any) {
    if(!this.level) return;
    if (this.VERBOSE_LEVELS[this.level] < this.VERBOSE_LEVELS['warning']) return ;
    console.warn(...message);
  }
  
  info(...message: any) {
    if(!this.level) return ;
    if (this.VERBOSE_LEVELS[this.level] < this.VERBOSE_LEVELS['info']) return ;
    console.info(...message);
  }
}