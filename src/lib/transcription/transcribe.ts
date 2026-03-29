import { AssemblyAI } from 'assemblyai';

/** Resultado da transcricao de um video */
export interface TranscriptionResult {
  text: string;
  durationSeconds: number | null;
  language: string | null;
}

/**
 * Transcreve um video a partir da URL (Bunny CDN ou outra URL publica) usando AssemblyAI.
 * @param audioUrl - URL publica do arquivo de audio/video
 * @returns Texto transcrito, duracao e idioma detectado
 */
export const transcribeVideo = async (audioUrl: string): Promise<TranscriptionResult> => {
  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave do AssemblyAI nao configurada (ASSEMBLY_AI_API_KEY)');
  }

  const client = new AssemblyAI({ apiKey });

  try {
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl,
      speech_models: ['universal-2'],
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error ?? 'Erro desconhecido na transcricao');
    }

    return {
      text: transcript.text ?? '',
      durationSeconds: transcript.audio_duration ?? null,
      language: transcript.language_code ?? null,
    };
  } catch (error) {
    throw new Error(`Erro ao transcrever video: ${(error as Error).message}`);
  }
};
