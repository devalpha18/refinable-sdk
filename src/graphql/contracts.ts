import { gql } from "graphql-request";

export const GET_REFINABLE_CONTRACT = gql`
  query refinableContract($input: GetRefinableContractInput!) {
    refinableContract(input: $input) {
      contractAddress
      contractABI
      type
      tags
      chainId
    }
  }
`;
export const GET_REFINABLE_CONTRACTS = gql`
  query refinableContracts($input: GetRefinableContractsInput!) {
    refinableContracts(input: $input) {
      contractAddress
      contractABI
      type
      tags
      chainId
    }
  }
`;

export const GET_MINTABLE_COLLECTIONS_QUERY = gql`
  query getMintableCollections {
    mintableCollections {
      default
      tokens {
        contractAddress
        contractABI
        contractType
        tokenType
        chainId
        tags
      }
    }
  }
`;

export const GET_COLLECTION = gql`
  query getCollectionBySlug($slug: String!) {
    collection(slug: $slug) {
      slug
    }
  }
`;

export const FIND_TOKEN_CONTRACT = gql`
  query getTokenContract($input: FindContractInput!) {
    contract(input: $input) {
      contractAddress
      contractABI
      type
      chainId
      tags
    }
  }
`;

export const CREATE_CONTRACT = gql`
  mutation createContract($data: CreateContractInput!) {
    createContract(data: $data) {
      id
      contractAddress
      contractABI
      type
      tags
      chainId
    }
  }
`;
