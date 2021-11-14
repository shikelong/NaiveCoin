import Block from "./Block";
import { calculateHash, calculateHashForBlock } from "./utils/hashHelper";
import { broadcastLatest } from "./utils/p2p";

//创世区块
//没有 previousHash
export const genesisBlock: Block = new Block(
  0,
  "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  null,
  1465154705,
  "I'm genesis block!"
);

export default class BlockChain {
  private blocks: Block[];

  constructor() {
    this.blocks = [genesisBlock];
  }

  getBlockChain = function () {
    return this.blocks;
  };

  addBlockToChain = function (newBlock: Block) {
    if (BlockChain.isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.blocks.push(newBlock);
      return true;
    }
    return false;
  };

  replaceChain = function (newBlocks: Block[]) {
    if (
      BlockChain.isValidChain(newBlocks) &&
      newBlocks.length > this.getBlockChain().length
    ) {
      console.log(
        "Received blockchain is valid. Replacing current blockchain with received blockchain"
      );
      this.blocks = newBlocks;
      broadcastLatest();
    } else {
      console.log("received blockchain invalid");
    }
  };

  getLastestBlock = function (): Block {
    return this.blocks[this.blocks.length - 1];
  };

  static generateNextBlock = function (blockData: string): Block {
    const previousBlock: Block = this.getLatestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = new Date().getTime() / 1000;
    const nextHash: string = calculateHash(
      nextIndex,
      previousBlock.hash,
      nextTimestamp,
      blockData
    );
    const newBlock: Block = new Block(
      nextIndex,
      nextHash,
      previousBlock.hash,
      nextTimestamp,
      blockData
    );
    return newBlock;
  };

  /**
   * judge is newBlock is valid.
   * 1. new Block's index must == previousBlock.index + 1
   * 2. previousHash must correct
   * 3. the hash of the newBlock itself must be valid.
   * @param newBlock
   */
  static isValidNewBlock = function (
    newBlock: Block,
    previousBlock: Block
  ): boolean {
    if (previousBlock.index + 1 !== newBlock.index) {
      console.error("new Block's index is invalid");
      return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
      console.error("new Block's previousHash is invalid");
      return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
      console.error(
        `new Block\'s hash is invalid, calculate is ${calculateHashForBlock(
          newBlock
        )}, block.hash is ${newBlock.hash}`
      );
      return false;
    }
    return true;
  };

  static isValidChain = function (blockChain: Block[]): boolean {
    const isValidGenesis = (block: Block) => {
      return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };

    if (!isValidGenesis(blockChain[0])) {
      return false;
    }

    for (let i = 1; i < blockChain.length; i++) {
      if (!BlockChain.isValidNewBlock(blockChain[i], blockChain[i - 1])) {
        return false;
      }
    }

    return true;
  };
}

export const blockChainInstance = new BlockChain();
