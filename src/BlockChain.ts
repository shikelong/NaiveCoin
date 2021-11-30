import Block from "./Block";
import { calculateHash, calculateHashForBlock } from "./utils/hashHelper";
import { broadcastLatest, broadCastTransactionPool } from "./utils/p2p";
import {
  BLOCK_GENERATION_INTERVAL,
  DIFFICULTY_ADJUSTMENT_INTERVAL,
  GENESIS_BLOCK,
} from "./utils/consts";
import {

  processTransactions,
  Transaction,
} from "./transaction/Transaction";
import Wallet, {
  getPrivateFromWallet,
  getPublicFromWallet,
} from "./transaction/Wallet";
import {
  addToTransactionPool,
  getTransactionPool,
  updateTransactionPool,
} from "./transaction/TransactionPool";
import { getCurrentTimeStamp } from "./utils/utils";
import {
  getAdjustedDifficulty,
  isValidNewBlock,
} from "./utils/blockChainUtils";
import { UnspentTxOut } from "./transaction/UnspentTxOut";
import { isValidAddress } from "./utils/cryptoUtils";

export default class BlockChain {
  private _blocks: Block[];
  private _unspentTxOuts: UnspentTxOut[] = [];

  constructor() {
    this._blocks = [GENESIS_BLOCK];
  }

  get blocks() {
    return this._blocks;
  }

  set blocks(v) {
    this._blocks = v;
  }

  get unspentTxOuts() {
    return this._unspentTxOuts;
  }
  set unspentTxOuts(v) {
    this._unspentTxOuts = v;
  }

  public appendBlock(newBlock: Block) {
    if (isValidNewBlock(newBlock, this.getLatestBlock())) {
      const retVal = processTransactions(
        newBlock.data,
        this._unspentTxOuts,
        newBlock.index
      );

      if (retVal === null) {
        return false;
      } else {
        this.blocks.push(newBlock);
        this.unspentTxOuts = retVal;
        updateTransactionPool(this._unspentTxOuts);
        return true;
      }
    }
    return false;
  }

  public replaceChain(newBlocks: Block[]) {
    const aUnspentTxOuts = BlockChain.isValidChain(newBlocks);
    const validChain: boolean = aUnspentTxOuts !== null;
    if (
      BlockChain.isValidChain(newBlocks) &&
      this.getAccumulatedDifficulty(newBlocks) > this.getAccumulatedDifficulty()
    ) {
      console.log(
        "Received blockchain is valid. Replacing current blockchain with received blockchain"
      );
      this.blocks = newBlocks;
      this.unspentTxOuts = aUnspentTxOuts;
      updateTransactionPool(this._unspentTxOuts);
      broadcastLatest();
    } else {
      console.log("received blockchain invalid");
    }
  }

  public getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public sendTransaction(address: string, amount: number): Transaction {
    const tx: Transaction = Wallet.createTransaction(
      address,
      amount,
      getPrivateFromWallet(),
      this.unspentTxOuts,
      getTransactionPool()
    );
    addToTransactionPool(tx, this.unspentTxOuts);
    broadCastTransactionPool();
    return tx;
  }

  public generateNextBlock(blockData: Transaction[]): Block {
    const newBlock: Block = this.findBlock(blockData);
    if (this.appendBlock(newBlock)) {
      broadcastLatest();
      return newBlock;
    }
    return null;
  }

  public handleReceivedTransaction(transaction: Transaction) {
    addToTransactionPool(transaction, this.unspentTxOuts);
  }

  public generateNextBlockWithTransaction(
    receiverAddress: string,
    amount: number
  ) {
    if (!isValidAddress(receiverAddress)) {
      throw new Error("invalid address");
    }
    if (amount < 0 || typeof amount !== "number") {
      throw new Error("invalid amount");
    }

    const coinbaseTx = getCoinbaseTransaction(
      getPublicFromWallet(),
      this.getLatestBlock().index + 1
    );
    const tx: Transaction = createTransaction(
      receiverAddress,
      amount,
      getPrivateFromWallet(),
      this.unspentTxOuts,
      getTransactionPool()
    );

    const blockData: Transaction[] = [coinbaseTx, tx];

    return this.generateRawNextBlock(blockData);
  }

  public generateRawNextBlock(blockData: Transaction[]) {
    const newBlock: Block = this.findBlock(blockData);
    if (this.appendBlock(newBlock)) {
      broadcastLatest();
      return newBlock;
    } else {
      return null;
    }
  }

  //Private methods Start

  private getDifficulty(): number {
    const latestBlock: Block = this.getLatestBlock();
    if (
      latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      latestBlock.index !== 0
    ) {
      return getAdjustedDifficulty(latestBlock, this.blocks);
    } else {
      return latestBlock.difficulty;
    }
  }

  private getAccumulatedDifficulty(blockChain = this.blocks): number {
    let accumulatedDifficulty = 0;
    for (let i = blockChain.length - 1; i >= 0; i--) {
      accumulatedDifficulty += Math.pow(2, blockChain[i].difficulty);
    }
    return accumulatedDifficulty;
  }

  /**
   * calc hash function many times to Find a block match difficulty
   * @param index
   * @param previousHash
   * @param timestamp
   * @param data
   * @param difficulty
   * @private
   */
  private findBlock(data: Transaction[]): Block {
    const latestBlock: Block = this.getLatestBlock();
    const difficulty: number = this.getDifficulty();
    const nextIndex: number = latestBlock.index + 1;
    const timeStamp: number = getCurrentTimeStamp();

    const fixedParams = {
      index: nextIndex,
      previousHash: latestBlock.hash,
      timeStamp: timeStamp,
      data: data,
      difficulty: difficulty,
    };

    let nonce = 0;
    while (true) {
      const hash: string = calculateHash({
        ...fixedParams,
        nonce,
      });
      if (Block.hashMatchesDifficulty(hash, difficulty)) {
        return new Block(
          nextIndex,
          hash,
          latestBlock.hash,
          timeStamp,
          data,
          difficulty,
          nonce
        );
      }
      nonce++;
    }
  }

  //Private methods End

  static isValidChain = function (blockChain: Block[]): UnspentTxOut[] {
    const isValidGenesis = (block: Block) => {
      return JSON.stringify(block) === JSON.stringify(GENESIS_BLOCK);
    };

    if (!isValidGenesis(blockChain[0])) {
      return null;
    }

    let aUnspentTxOuts: UnspentTxOut[] = [];

    for (let i = 1; i < blockChain.length; i++) {
      if (!isValidNewBlock(blockChain[i], blockChain[i - 1])) {
        return null;
      }

      aUnspentTxOuts = processTransactions(
        blockChain[i].data,
        aUnspentTxOuts,
        blockChain[i].index
      );

      if (aUnspentTxOuts === null) {
        console.log("invalid transactions in blockchain");
        return null;
      }
    }

    return aUnspentTxOuts;
  };
}

export const blockChainInstance = new BlockChain();
