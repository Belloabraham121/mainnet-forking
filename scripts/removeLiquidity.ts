import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const USDC_DAI_PAIR = "0xAE461cA67B15dc8dc81CE7615e0320dA1A9aB8D5";
    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";

    await helpers.impersonateAccount(TOKEN_HOLDER);
    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    const amountADesired = ethers.parseUnits("100", 6);
    const amountBDesired = ethers.parseUnits("100", 18);
    const amountAMinimum = ethers.parseUnits("90", 6);
    const amountBMinimum = ethers.parseUnits("90", 18);

    const USDC_Contract = await ethers.getContractAt("IERC20", USDC, impersonatedSigner);
    const DAI_Contract = await ethers.getContractAt("IERC20", DAI, impersonatedSigner);
    const LP_Contract = await ethers.getContractAt("IERC20", USDC_DAI_PAIR, impersonatedSigner); 
    
    const ROUTER = await ethers.getContractAt("IUniswapV2Router", ROUTER_ADDRESS, impersonatedSigner);

    // Approve spending
    await USDC_Contract.approve(ROUTER_ADDRESS, amountADesired);
    await DAI_Contract.approve(ROUTER_ADDRESS, amountBDesired);

    // Check balances and allowances
    const usdcBal = await USDC_Contract.balanceOf(impersonatedSigner.address);
    const daiBal = await DAI_Contract.balanceOf(impersonatedSigner.address);
    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);

    console.log("USDC balance before swap", Number(usdcBal));
    console.log("DAI balance before swap", Number(daiBal));

    // Check LP token balance before the transaction
    const lpBalBefore = await LP_Contract.balanceOf(impersonatedSigner.address);
    console.log("LP Token Balance before:", Number(lpBalBefore));

    const addLiqTx = await ROUTER.addLiquidity(
        USDC,
        DAI,
        amountADesired,
        amountBDesired,
        amountAMinimum,
        amountBMinimum,
        impersonatedSigner.address,
        deadline
    );
    await addLiqTx.wait();

    const usdcBalAfter = await USDC_Contract.balanceOf(impersonatedSigner.address);
    const daiBalAfter = await DAI_Contract.balanceOf(impersonatedSigner.address);

    console.log("=========================================================");

    console.log("USDC balance after liquidity", Number(usdcBalAfter));
    console.log("DAI balance after liquidity", Number(daiBalAfter));

    console.log("=========================================================");

    // Check LP token balance after adding liquidity
    const lpBalAfter = await LP_Contract.balanceOf(impersonatedSigner.address);
    console.log("LP Token Balance after adding liquidity:", Number(lpBalAfter));

    // ============================== REMOVE LIQUIDITY =================================

    // Approve the router to spend LP tokens
    await LP_Contract.approve(ROUTER_ADDRESS, lpBalAfter);

    const removeLiqTx = await ROUTER.removeLiquidity(
        USDC,
        DAI,
        lpBalAfter,
        0,
        0,
        impersonatedSigner.address,
        deadline
    );
    await removeLiqTx.wait();

    console.log("=========================================================");

    // Check LP token balance after removal
    const lpBalAfterRemoval = await LP_Contract.balanceOf(impersonatedSigner.address);
    console.log("LP Token Balance after removal:", Number(lpBalAfterRemoval));
    
    console.log("=========================================================");

    // Check final token balances
    const finalUsdcBal = await USDC_Contract.balanceOf(impersonatedSigner.address);
    const finalDaiBal = await DAI_Contract.balanceOf(impersonatedSigner.address);
    console.log("Final USDC balance:", Number(finalUsdcBal));
    console.log("Final DAI balance:", Number(finalDaiBal));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});