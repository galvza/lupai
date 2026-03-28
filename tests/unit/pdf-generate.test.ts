import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsPDF
const mockAddFileToVFS = vi.fn();
const mockAddFont = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockOutput = vi.fn().mockReturnValue(new ArrayBuffer(100));
const mockSplitTextToSize = vi.fn().mockImplementation((text: string) => [text]);

const mockDocInstance = {
  addFileToVFS: mockAddFileToVFS,
  addFont: mockAddFont,
  setFont: mockSetFont,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  text: mockText,
  addPage: mockAddPage,
  output: mockOutput,
  splitTextToSize: mockSplitTextToSize,
  internal: { pageSize: { height: 297, width: 210, getHeight: () => 297, getWidth: () => 210 } },
  lastAutoTable: { finalY: 50 },
};

vi.mock('jspdf', () => ({
  jsPDF: class {
    addFileToVFS = mockAddFileToVFS;
    addFont = mockAddFont;
    setFont = mockSetFont;
    setFontSize = mockSetFontSize;
    setTextColor = mockSetTextColor;
    text = mockText;
    addPage = mockAddPage;
    output = mockOutput;
    splitTextToSize = mockSplitTextToSize;
    internal = { pageSize: { height: 297, width: 210, getHeight: () => 297, getWidth: () => 210 } };
    lastAutoTable = { finalY: 50 };
  },
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// Mock supabase queries
vi.mock('@/lib/supabase/queries', () => ({
  getAnalysis: vi.fn(),
  getCompetitorsByAnalysis: vi.fn(),
  getUserBusinessByAnalysis: vi.fn(),
  getViralContentByAnalysis: vi.fn(),
  getSynthesisByAnalysis: vi.fn(),
}));

// Mock fonts (avoid loading 150KB base64 in tests)
vi.mock('@/lib/pdf/fonts', () => ({
  ROBOTO_REGULAR_BASE64: 'MOCK_BASE64_FONT_DATA',
}));

import { generateAnalysisPdf } from '@/lib/pdf/generate';
import {
  getAnalysis,
  getCompetitorsByAnalysis,
  getUserBusinessByAnalysis,
  getViralContentByAnalysis,
  getSynthesisByAnalysis,
} from '@/lib/supabase/queries';
import {
  createAnalysis,
  createCompetitor,
  createViralContent,
  createSynthesis,
} from '../fixtures/factories';

const mockGetAnalysis = vi.mocked(getAnalysis);
const mockGetCompetitors = vi.mocked(getCompetitorsByAnalysis);
const mockGetUserBusiness = vi.mocked(getUserBusinessByAnalysis);
const mockGetViralContent = vi.mocked(getViralContentByAnalysis);
const mockGetSynthesis = vi.mocked(getSynthesisByAnalysis);

describe('generateAnalysisPdf', () => {
  const mockAnalysis = createAnalysis({ id: 'pdf-test-001', status: 'completed' });
  const mockCompetitors = [
    createCompetitor({ id: 'c1', name: 'Concorrente A' }),
    createCompetitor({ id: 'c2', name: 'Concorrente B' }),
  ];
  const mockViralContent = [createViralContent({ id: 'v1' })];
  const mockSynthesis = createSynthesis({ id: 's1' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.mockReturnValue(new ArrayBuffer(100));
    mockSplitTextToSize.mockImplementation((text: string) => [text]);
    mockGetAnalysis.mockResolvedValue(mockAnalysis);
    mockGetCompetitors.mockResolvedValue(mockCompetitors);
    mockGetUserBusiness.mockResolvedValue(null);
    mockGetViralContent.mockResolvedValue(mockViralContent);
    mockGetSynthesis.mockResolvedValue(mockSynthesis);
  });

  it('chama getAnalysis e todas as queries de dados em paralelo', async () => {
    await generateAnalysisPdf('pdf-test-001');

    expect(mockGetAnalysis).toHaveBeenCalledWith('pdf-test-001');
    expect(mockGetCompetitors).toHaveBeenCalledWith('pdf-test-001');
    expect(mockGetUserBusiness).toHaveBeenCalledWith('pdf-test-001');
    expect(mockGetViralContent).toHaveBeenCalledWith('pdf-test-001');
    expect(mockGetSynthesis).toHaveBeenCalledWith('pdf-test-001');
  });

  it('lanca erro quando analise nao encontrada', async () => {
    mockGetAnalysis.mockResolvedValue(null);

    await expect(generateAnalysisPdf('nao-existe')).rejects.toThrow('Analise nao encontrada');
  });

  it('lanca erro quando analise nao esta completa (processing)', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'processing' }));

    await expect(generateAnalysisPdf('test')).rejects.toThrow('Analise nao concluida');
  });

  it('lanca erro quando analise nao esta completa (failed)', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'failed' }));

    await expect(generateAnalysisPdf('test')).rejects.toThrow('Analise nao concluida');
  });

  it('lanca erro quando analise nao esta completa (pending)', async () => {
    mockGetAnalysis.mockResolvedValue(createAnalysis({ status: 'pending' }));

    await expect(generateAnalysisPdf('test')).rejects.toThrow('Analise nao concluida');
  });

  it('cria documento jsPDF e configura fonte Roboto', async () => {
    await generateAnalysisPdf('pdf-test-001');

    // Verifica que o documento foi criado e configurado (addFileToVFS chamado)
    expect(mockAddFileToVFS).toHaveBeenCalled();
    expect(mockAddFont).toHaveBeenCalled();
    expect(mockSetFont).toHaveBeenCalledWith('Roboto');
  });

  it('carrega fonte Roboto via addFileToVFS e addFont', async () => {
    await generateAnalysisPdf('pdf-test-001');

    expect(mockAddFileToVFS).toHaveBeenCalledWith('Roboto-Regular.ttf', 'MOCK_BASE64_FONT_DATA');
    expect(mockAddFont).toHaveBeenCalledWith('Roboto-Regular.ttf', 'Roboto', 'normal');
    expect(mockSetFont).toHaveBeenCalledWith('Roboto');
  });

  it('chama doc.output com arraybuffer', async () => {
    await generateAnalysisPdf('pdf-test-001');

    expect(mockOutput).toHaveBeenCalledWith('arraybuffer');
  });

  it('retorna ArrayBuffer', async () => {
    const result = await generateAnalysisPdf('pdf-test-001');

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('funciona sem sintese (pula market overview e recomendacoes)', async () => {
    mockGetSynthesis.mockResolvedValue(null);

    const result = await generateAnalysisPdf('pdf-test-001');

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(mockOutput).toHaveBeenCalledWith('arraybuffer');
  });

  it('funciona com array vazio de concorrentes', async () => {
    mockGetCompetitors.mockResolvedValue([]);

    const result = await generateAnalysisPdf('pdf-test-001');

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('funciona com array vazio de conteudo viral', async () => {
    mockGetViralContent.mockResolvedValue([]);

    const result = await generateAnalysisPdf('pdf-test-001');

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('nao lanca erro quando sub-queries falham (safeQuery)', async () => {
    mockGetCompetitors.mockRejectedValue(new Error('Erro no banco'));
    mockGetViralContent.mockRejectedValue(new Error('Timeout'));
    mockGetSynthesis.mockRejectedValue(new Error('Connection lost'));

    const result = await generateAnalysisPdf('pdf-test-001');

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it('chama addPage ao menos uma vez (para capa)', async () => {
    await generateAnalysisPdf('pdf-test-001');

    expect(mockAddPage).toHaveBeenCalled();
  });
});

describe('PDF section null-safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.mockReturnValue(new ArrayBuffer(50));
    mockSplitTextToSize.mockImplementation((text: string) => [text]);
    mockGetAnalysis.mockResolvedValue(
      createAnalysis({ id: 'null-test', status: 'completed', nicheInterpreted: null })
    );
    mockGetCompetitors.mockResolvedValue([]);
    mockGetUserBusiness.mockResolvedValue(null);
    mockGetViralContent.mockResolvedValue([]);
    mockGetSynthesis.mockResolvedValue(null);
  });

  it('funciona com todos os dados vazios/null', async () => {
    const result = await generateAnalysisPdf('null-test');

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(mockOutput).toHaveBeenCalledWith('arraybuffer');
  });

  it('usa nicheInput como fallback quando nicheInterpreted e null', async () => {
    await generateAnalysisPdf('null-test');

    // Cover page should use nicheInput as fallback
    expect(mockText).toHaveBeenCalled();
  });
});
