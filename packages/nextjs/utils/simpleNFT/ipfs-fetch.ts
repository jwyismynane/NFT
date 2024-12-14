import axios from 'axios';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

const pinataApiUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const pinataGatewayUrl = 'https://gateway.pinata.cloud/ipfs/';

export const addToIPFS = async (yourJSON: object) => {
  try {
    const response = await axios.post(
      pinataApiUrl,
      yourJSON,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
      }
    );

    if (response.status === 200) {
      return { 
        IpfsHash: response.data.IpfsHash,
        PinSize: response.data.PinSize,
        Timestamp: response.data.Timestamp,
        pinataUrl: `${pinataGatewayUrl}${response.data.IpfsHash}`
      };
    } else {
      throw new Error('Failed to upload to Pinata');
    }
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
};

export const getMetadataFromIPFS = async (ipfsHash: string) => {
  try {
    const response = await axios.get(ipfsHash);
    return response.data;
  } catch (error) {
    console.error('Error fetching metadata from Pinata:', error);
    throw error;
  }
};