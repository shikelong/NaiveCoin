// in seconds
import Block from "../Block";

export const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
export const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

export const COINBASE_AMOUNT: number = 50;


//Genesis Block 创世区块
//previousHash
export const GENESIS_BLOCK: Block = new Block(
  0,
  "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  null,
  1465154705,
  [],
  0,
  0
);
