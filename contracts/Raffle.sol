//Raffle

// tasks
// Enter the lottery (pay some ether)
// Pick a random number not just like math function of randomness it must be truely random
// winner to be selected in every x minutes ->auto matic

//Chainlink Oracle -> Randomness, Automatic Excecution (Chainlink keepers)

// SPDX-Liscence-Identifier: MIT

pragma solidity ^0.8.7;
error Raffle__NotEnoughEth();
error Raffle__WinnerTransferFailed();
error Raffle__NotOpen();
error Raffle__NotUpkeepNeeded();

/**
 * @title A sample raffle contract
 * @author Divanshu Prajapat
 * @notice  This contract is used to enter the raffle and pick a
 * random winner
 * @dev  This constract use Chainlink VRF to pick a random winner
 */

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

 contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // type declaration
    enum RaffleState {
        Open,
        CalculatingWinner
    }

    // state variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUMBER_WORD = 1;
    uint256 private immutable i_interval = 0.5 minutes;
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event RaffleWinner(address indexed winner);

    // Lottery variables
    address private s_recentwinner;
    RaffleState private s_raffleState;
    uint256 private s_lastimestamp;

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 keyHash1, // max gas limit ~~ gas lane
        uint64 subId,
        uint32 cbgaslim
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyHash = keyHash1;
        i_subId = subId;
        i_callbackGasLimit = cbgaslim;
        s_raffleState = RaffleState.Open;
        // s_raffleState = RaffleState(0);
        s_lastimestamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughEth();
        }

        if (s_raffleState != RaffleState.Open) {
            revert Raffle__NotOpen();
        }

        s_players.push(payable(msg.sender));
        // typecasting msg.sender to payable address
        // because msg.sender is of type address not payable address default
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev  this function is called by the keeper to determine whether or not to call performUpkeep
     * if it returns true, the performUpkeep function will be called
     * 1. Over time interval should passed
     * 2. the lottery should have one or more players
     * 3. our subscription should be paid with enough LINK
     * 4. The lottery should be in open state
     * 5.
     */

    function checkUpkeep(
        bytes memory
    )
        public
        view
        override
        returns (
            // checkData
            bool upkeepNeeded,
            bytes memory performData
        )
    {
        bool isOpen = s_raffleState == RaffleState.Open;
        bool timepassed = (block.timestamp - s_lastimestamp) > i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasEnoughLink = address(this).balance > 0;
        upkeepNeeded = isOpen && timepassed && hasPlayers && hasEnoughLink;
        return (upkeepNeeded, "");
    }

    function performUpkeep(bytes memory) external override //  performData
    {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__NotUpkeepNeeded();
        }

        s_raffleState = RaffleState.CalculatingWinner;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, // max gas for this func
            i_subId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUMBER_WORD
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords ( 
        uint256 requestId,
        uint256[] memory randomWords
    ) internal   override
    {
        uint256 randomIndex = randomWords[0] % s_players.length;
        address payable recentwinner = s_players[randomIndex];
        s_recentwinner = recentwinner;

        (bool success, ) = recentwinner.call{value: address(this).balance}("");
        s_raffleState = RaffleState.Open;
        s_players = new address payable[](0);
        s_lastimestamp = block.timestamp;
        if (!success) {
            revert Raffle__WinnerTransferFailed();
        }
        emit RaffleWinner(recentwinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getPlayersLength() public view returns (uint256) {
        return s_players.length;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentwinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint32) {
        // pure function does not read or write to state variables because it is not a part of the contract
        return NUMBER_WORD;
    }

    function getCallbackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getSubId() public view returns (uint64) {
        return i_subId;
    }

    function getKeyHash() public view returns (bytes32) {
        return i_keyHash;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getLinkBalance() public view returns (uint256) {
        return address(this).balance;
    }



    function getVrfCoordinator() public view returns (address) {
        return address(i_vrfCoordinator);
    }

    function getConfirmations() public pure returns (uint16) {
        return REQUEST_CONFIRMATIONS;
    }
    function getLastTimeStamp() public view returns (uint256) {
        return s_lastimestamp;
    }

    function getBlockTimeStamp() public view returns (uint256) {
        return block.timestamp;
    }
    function getNumPlayers() public view returns (uint256) {
        return s_players.length;
    }


}

