import { BlobServiceClient } from "@azure/storage-blob";

const deleteFromAzureBlob = async (fileUrl) => {
  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  // Validate environment variables
  if (!AZURE_STORAGE_CONNECTION_STRING || !containerName) {
    throw new Error('Azure storage connection string or container name is missing.');
  }

  try {
    // Parse the blob name from the file URL
    const urlParts = new URL(fileUrl);
    const blobName = urlParts.pathname.substring(containerName.length + 2); // Remove container name and the initial '/'

    // Create the BlobServiceClient object
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    // Get a reference to the container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Get a reference to the blob
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Delete the blob
    await blockBlobClient.deleteIfExists();

    console.log(`File ${blobName} deleted successfully.`);
    return true;
  } catch (error) {
    console.error("Error deleting file from Azure Blob Storage:", error);
    throw new Error("Failed to delete file from Azure Blob Storage");
  }
};

export default deleteFromAzureBlob;