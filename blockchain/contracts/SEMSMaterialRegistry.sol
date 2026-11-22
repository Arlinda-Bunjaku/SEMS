// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SEMSMaterialRegistry {
    struct Material {
        address professor;
        string title;
        bytes32 contentHash;
        uint256 createdAt;
        bool exists;
    }

    mapping(bytes32 => Material) private materials;

    event MaterialRegistered(
        bytes32 indexed materialId,
        address indexed professor,
        string title,
        bytes32 contentHash,
        uint256 createdAt
    );

    function registerMaterial(
        bytes32 materialId,
        string calldata title,
        bytes32 contentHash
    ) external {
        require(materialId != bytes32(0), "ID is required");
        require(bytes(title).length > 0, "Title is required");
        require(contentHash != bytes32(0), "Hash is required");
        require(!materials[materialId].exists, "Material already registered");

        materials[materialId] = Material({
            professor: msg.sender,
            title: title,
            contentHash: contentHash,
            createdAt: block.timestamp,
            exists: true
        });

        emit MaterialRegistered(
            materialId,
            msg.sender,
            title,
            contentHash,
            block.timestamp
        );
    }

    function getMaterial(bytes32 materialId)
        external
        view
        returns (
            address professor,
            string memory title,
            bytes32 contentHash,
            uint256 createdAt,
            bool exists
        )
    {
        Material memory material = materials[materialId];

        return (
            material.professor,
            material.title,
            material.contentHash,
            material.createdAt,
            material.exists
        );
    }
}