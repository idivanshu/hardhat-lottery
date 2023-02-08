const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat.config");

 

 !developmentChains.includes(network.name)? describe.skip
 : 
 describe("Raffle Unit tests", async function (){

    let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player , deployer
    const chainId = network.config.chainId


    beforeEach(
        async () => {
            accounts = await ethers.getSigners() // could also do with getNamedAccounts
            // //   deployer = accounts[0]
            // player = accounts[1]
            
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"]) // Deploys modules with the tags "mocks" and "raffle"
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock") // Returns a new connection to the VRFCoordinatorV2Mock contract
            raffle = await ethers.getContract("Raffle", deployer) // Returns a new connection to the Raffle contract
             // Returns a new instance of the Raffle contract connected to player
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
            console.log("done dona done");
        }

    )

////////
describe("constructor", async function () {
    it("initializes the raffle correctly", async () => {
        // Ideally, we'd separate these out so that only 1 assert per "it" block
        // And ideally, we'd make this check everything
        const raffleState = (await raffle.getRaffleState()).toString()
        // Comparisons for Raffle initialization:
        assert.equal(raffleState, "0")
      
    })
})


describe("enterRaffle", function () {
    it("reverts when you don't pay enough", async () => {
        await expect(raffle.enterRaffle()).to.be.revertedWith( // is reverted when not paid enough or raffle is not open
            "Raffle__NotEnoughEth"
        )
    })
    it("records player when they enter", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        const contractPlayer = await raffle.getPlayers(0)
        assert.equal(deployer, contractPlayer)
    })
    it("emits event on enter", async () => {
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit( // emits RaffleEnter event if entered to index player(s) address
            raffle,
            "RaffleEnter"
        )
    })
    it("doesn't allow entrance when raffle is calculating", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        // we pretend to be a keeper for a second
        await raffle.performUpkeep([]) // changes the state to calculating for our comparison below
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith( // is reverted as raffle is calculating
           "Raffle__NotOpen"
        )
    })
})


describe("checkUpkeep", function () {
    it("returns false if people haven't sent any ETH", async () => {
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        // callStatic is a way to call a function without actually executing it
        assert(!upkeepNeeded)
    })
    it("returns false if raffle isn't open", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])

        await raffle.performUpkeep([]) // changes the state to calculating
        const raffleState = await raffle.getRaffleState() // stores the new state
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
    })
    it("returns false if enough time hasn't passed", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
        await network.provider.request({ method: "evm_mine", params: [] })
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        assert(!upkeepNeeded)
    })
    it("returns true if enough time has passed, has players, eth, and is open", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        assert(upkeepNeeded)
    })
})

describe("performUpkeep", function () {
    it("can only run if checkupkeep is true", async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
        const tx = await raffle.performUpkeep("0x") 
        assert(tx)
    })
    it("reverts if checkup is false", async () => {
        await expect(raffle.performUpkeep("0x")).to.be.revertedWith( 
            "Raffle__NotUpkeepNeeded"
        )
    })
    it("updates the raffle state and emits a requestId", async () => {
        // Too many asserts in this test!
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
        const txResponse = await raffle.performUpkeep("0x") // emits requestId
        const txReceipt = await txResponse.wait(1) // waits 1 block
        const raffleState = await raffle.getRaffleState() // updates state
        const requestId = txReceipt.events[1].args.requestId
        assert(requestId.toNumber() > 0)
        assert(raffleState == 1) // 0 = open, 1 = calculating
    })
})


describe("fulfillRandomWords", function () {
    beforeEach(async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
    })
    it("can only be called after performupkeep", async () => {
        await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
        ).to.be.revertedWith("nonexistent request")
        await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
        ).to.be.revertedWith("nonexistent request")
    })

  // This test is too big...
  // This test simulates users entering the raffle and wraps the entire functionality of the raffle
  // inside a promise that will resolve if everything is successful.
  // An event listener for the WinnerPicked is set up
  // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
  // All the assertions are done once the WinnerPicked event is fired
    it("picks a winner, resets, and sends money", async () => {
        const additionalEntrances = 3 // to test
        const startingIndex = 1
        for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) { // i = 2; i < 5; i=i+1
          const  accountsconnectedwithraffle = raffle.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
            await accountsconnectedwithraffle.enterRaffle({ value: raffleEntranceFee })
        }
        const startingTimeStamp = await raffle.getLastTimeStamp() // stores starting timestamp (before we fire our event)

        // This will be more important for our staging tests...
        await new Promise(async (resolve, reject) => {
            raffle.once("RaffleWinner", async () => { // event listener for WinnerPicked
                console.log("WinnerPicked event fired!")
                // assert throws an error if it fails, so we need to wrap
                // it in a try/catch so that the promise returns event
                // if it fails.
                try {
                    // Now lets get the ending values...
                    const recentWinner = await raffle.getRecentWinner()
                    const raffleState = await raffle.getRaffleState()
                    const winnerBalance = await accounts[1].getBalance()
                    const endingTimeStamp = await raffle.getLastTimeStamp()
                   const numPlayers = await raffle.getNumPlayers()
                    // Now lets assert the values...
                    assert.equal(numPlayers.toString(), "0")
                    assert.equal(raffleState.toString(), "0")    
                    assert.equal(endingTimeStamp.toString()>startingTimeStamp.toString(),true)

                    // assert.equal(
                    //     winnerBalance.toString(),
                        


                    // )

                    resolve() // if try passes, resolves the promise 
                } catch (e) { 
                    reject(e) // if try fails, rejects the promise
                }
            })

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await raffle.performUpkeep("0x")
            const txReceipt = await tx.wait(1)
            const startingBalance = await accounts[2].getBalance()
            await vrfCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args.requestId,
                raffle.address
            )
        })
    })
})


 })