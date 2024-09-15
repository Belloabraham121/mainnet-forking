import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import {ethers} from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("UseSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployUseSwap() {


    const [owner] = await ethers.getSigners();
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    const UseSwap = await ethers.getContractFactory("UseSwap");
    const useSwap = await UseSwap.deploy(ROUTER_ADDRESS);

    return { useSwap, owner, ROUTER_ADDRESS };
  }

  describe("Deployment", function () {

    it("Should set the right router address",async function () {
      const { useSwap, ROUTER_ADDRESS } = await loadFixture(deployUseSwap);


      expect(await useSwap.uniswapRouter()).to.equal(ROUTER_ADDRESS);
      
    })

    it("Should swap tokens for exact tokens", async function () {
      const { useSwap, ROUTER_ADDRESS } = await loadFixture(deployUseSwap);

      const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";

      await helpers.impersonateAccount(TOKEN_HOLDER);
      const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

      const amountOut = ethers.parseUnits("20", 18);
      const amountInMax = ethers.parseUnits("1000", 6);

      const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
      const DAI_Contract = await ethers.getContractAt("IERC20", DAI);
      const deadline = Math.floor(Date.now() / 1000) + (60 * 10);

      await USDC_Contract.approve(useSwap, amountInMax);

      const tx = await useSwap.connect(impersonatedSigner).handleSwap(amountOut, amountInMax, [USDC, DAI], impersonatedSigner.address, deadline);

      tx.wait();

      await USDC_Contract.approve(useSwap, amountInMax);
      
      const tx1 = await useSwap.connect(impersonatedSigner).handleSwap(amountOut, amountInMax, [USDC, DAI], impersonatedSigner.address, deadline);

      tx1.wait();

      expect(await useSwap.uniswapRouter()).to.equal(ROUTER_ADDRESS);
      expect(await useSwap.swapCount()).to.equal(2);

    });
  });
});
