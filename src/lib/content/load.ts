import { propertySchema, type PropertyContent } from '../../data/property.schema';

/**
 * Origem do conteúdo. Hoje: arquivo JSON versionado (build).
 * Etapa 6: implementação D1 com o mesmo contrato, alimentada pelo painel.
 */
export interface ContentSource {
  readonly name: string;
  read(): Promise<unknown>;
}

export class ContentValidationError extends Error {
  constructor(
    public readonly source: string,
    public readonly issues: { path: string; message: string }[],
  ) {
    super(
      `Conteúdo inválido em "${source}":\n` +
        issues.map((i) => `  - ${i.path || '(raiz)'}: ${i.message}`).join('\n'),
    );
    this.name = 'ContentValidationError';
  }
}

export function parseContent(raw: unknown, sourceName: string): PropertyContent {
  // `$comment` é metadado editorial do arquivo, não conteúdo.
  const input =
    raw && typeof raw === 'object' && '$comment' in raw
      ? Object.fromEntries(Object.entries(raw).filter(([k]) => k !== '$comment'))
      : raw;

  const result = propertySchema.safeParse(input);
  if (!result.success) {
    throw new ContentValidationError(
      sourceName,
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/**
 * Carrega e valida o conteúdo. Falha de forma explícita: no build, conteúdo
 * inválido interrompe a publicação em vez de gerar uma página quebrada.
 */
export async function loadContent(source: ContentSource): Promise<PropertyContent> {
  return parseContent(await source.read(), source.name);
}

export const fileSource: ContentSource = {
  name: 'src/data/ametista.json',
  read: async () => (await import('../../data/ametista.json')).default,
};
