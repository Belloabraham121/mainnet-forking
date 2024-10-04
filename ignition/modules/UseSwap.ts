import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const UseSwapModule = buildModule("UseSwapModule", (m) => {

  const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"

  const UseSwap = m.contract("UseSwap", [uniswapRouter]);

  return { UseSwap };
});

export default UseSwapModule;
