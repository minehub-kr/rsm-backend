import chalk from 'chalk';
import Figlet from 'figlet';
import fs from 'fs';

const Log = {
  info: (...msg: any[]) => {
    console.log(`${chalk.cyanBright(chalk.bold('i'))}`, ...msg);
  },
  warn: (...msg: any[]) => {
    console.log(`${chalk.yellowBright(chalk.bold('!'))}`, ...msg);
  },
  error: (...msg: any[]) => {
    console.log(`${chalk.redBright(chalk.bold('×'))}`, ...msg);
  },
  ok: (...msg: any[]) => {
    console.log(`${chalk.greenBright(chalk.bold('√'))}`, ...msg);
  },
};

export default Log;
