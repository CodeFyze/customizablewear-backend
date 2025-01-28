import { BlobServiceClient } from '@azure/storage-blob';

// Function to upload a file to Azure Blob Storage
const uploadToAzure = async (file, name) => {
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  // Validate environment variables
  if (!AZURE_STORAGE_CONNECTION_STRING || !containerName) {
    throw new Error('Azure storage connection string or container name is missing.');
  }

  try {
    // Create the BlobServiceClient object
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    // Get a reference to the container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Generate a unique name for the blob (file)
    const blobName = `${name}`;
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the file buffer to Azure Blob Storage
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }, // Set MIME type
    });

    // Return the URL of the uploaded file
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading file to Azure:', error);
    throw new Error('Failed to upload file to Azure Blob Storage');
  }
};

export default uploadToAzure;
