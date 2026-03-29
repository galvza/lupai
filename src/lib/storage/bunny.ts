/**
 * Faz upload de um arquivo para o Bunny Storage.
 * @param filePath - Caminho do arquivo dentro da storage zone
 * @param fileBuffer - Buffer ou Uint8Array com o conteudo do arquivo
 * @returns URL publica do CDN para o arquivo
 */
export const uploadFile = async (
  filePath: string,
  fileBuffer: Buffer | Uint8Array
): Promise<string> => {
  const { storageApiKey, storageZoneName, cdnUrl } = getBunnyEnv();
  const response = await fetch(
    `https://br.storage.bunnycdn.com/${storageZoneName}/${filePath}`,
    {
      method: 'PUT',
      headers: {
        AccessKey: storageApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer as unknown as BodyInit,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao fazer upload para Bunny Storage: ${response.status} ${response.statusText}`
    );
  }

  return `${cdnUrl}/${filePath}`;
};

/**
 * Faz download de um arquivo do Bunny Storage.
 * @param filePath - Caminho do arquivo dentro da storage zone
 * @returns Buffer com o conteudo do arquivo
 */
export const downloadFile = async (filePath: string): Promise<Buffer> => {
  const { storageApiKey, storageZoneName } = getBunnyEnv();

  const response = await fetch(
    `https://br.storage.bunnycdn.com/${storageZoneName}/${filePath}`,
    {
      method: 'GET',
      headers: { AccessKey: storageApiKey },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao baixar arquivo do Bunny Storage: ${response.status} ${response.statusText}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
};

/**
 * Deleta um arquivo do Bunny Storage.
 * @param filePath - Caminho do arquivo dentro da storage zone
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  const { storageApiKey, storageZoneName } = getBunnyEnv();

  const response = await fetch(
    `https://br.storage.bunnycdn.com/${storageZoneName}/${filePath}`,
    {
      method: 'DELETE',
      headers: { AccessKey: storageApiKey },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao deletar arquivo do Bunny Storage: ${response.status} ${response.statusText}`
    );
  }
};

/**
 * Gera a URL publica do CDN para um arquivo.
 * @param filePath - Caminho do arquivo dentro da storage zone
 * @returns URL publica do CDN
 */
export const getBunnyUrl = (filePath: string): string => {
  const { cdnUrl } = getBunnyEnv();
  return `${cdnUrl}/${filePath}`;
};

/** Leitura segura das env vars do Bunny */
const getBunnyEnv = () => {
  const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
  const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
  const cdnUrl = process.env.BUNNY_CDN_URL;

  if (!storageApiKey || !storageZoneName || !cdnUrl) {
    throw new Error(
      'Variaveis de ambiente do Bunny nao configuradas (BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE_NAME, BUNNY_CDN_URL)'
    );
  }

  return { storageApiKey, storageZoneName, cdnUrl };
};
