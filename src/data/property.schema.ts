import { z } from 'astro/zod';
import { validateExternalUrl, type ExternalLinkKind } from '../lib/validation/urls';

/**
 * Contrato do conteúdo editável do residencial.
 *
 * - Todo campo não confirmado pelo cliente é opcional/vazio — nunca preenchido
 *   com texto fictício. Componentes só renderizam o que existe.
 * - Somente texto puro: nenhum campo aceita HTML (renderizado sempre escapado).
 * - Este mesmo schema valida o arquivo local hoje e a API do painel na Etapa 6.
 */

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[<>]/.test(v), 'Texto não pode conter os caracteres < ou >');

const externalUrl = (kind: ExternalLinkKind) =>
  z.string().transform((value, ctx) => {
    const result = validateExternalUrl(value, kind);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.reason });
      return z.NEVER;
    }
    return result.url;
  });

/** Ponto focal do recorte (CSS object-position em %), ex.: "50% 35%". */
const focusPoint = z
  .string()
  .regex(/^(100|\d{1,2})% (100|\d{1,2})%$/, 'Use o formato "X% Y%" (0–100)');

const photoSource = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((source) => {
    const mediaPath =
      /^\/media\/residencial-ametista\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/;
    if (mediaPath.test(source)) return true;
    if (source.startsWith('/') || source.includes('\\')) return false;
    return source.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part));
  }, 'Use um caminho de foto local ou um arquivo de mídia carregado neste residencial');

const imageRef = z.object({
  /** Caminho relativo a src/assets/photos (Etapa 4) ou chave no R2 (Etapa 6). */
  src: photoSource,
  /** Texto alternativo descritivo; vazio somente para imagem decorativa. */
  alt: z.string().trim().max(250),
  focus: focusPoint.optional(),
});

/**
 * Grupos narrativos da galeria, na ordem em que a história é contada.
 * Usados APENAS para ordenar — nunca exibidos como rótulo (não rotulamos
 * cômodos que não tenham sido confirmados).
 */
export const galleryGroups = ['fachada', 'social', 'quartos', 'terraco', 'detalhes'] as const;

/**
 * Ícones de traço disponíveis para o conteúdo (quickFacts, diferenciais,
 * informações essenciais). Cada nome existe em components/ui/Icon.astro —
 * a correspondência é verificada em tempo de compilação lá.
 */
export const contentIcons = [
  'waves',
  'footprints',
  'flame',
  'parking',
  'paw',
  'snowflake',
  'wifi',
  'home',
  'utensils',
  'bed',
  'bath',
  'area',
  'clock',
  'baby',
  'shirt',
  'umbrella',
  'tv',
  'washer',
  'users',
  'heart',
  'store',
  'sun',
  'coffee',
] as const;
const icon = z.enum(contentIcons);

/** Foto de terceiros (ex.: região) com crédito de autoria/licença. */
const creditedImage = imageRef.extend({ credit: plainText(160).optional() });

const galleryPhoto = imageRef.extend({
  group: z.enum(galleryGroups).optional(),
  /** Legenda exibida no modo ampliado — somente se fornecida/confirmada. */
  caption: plainText(140).optional(),
});

export const propertySchema = z.object({
  name: plainText(80),
  tagline: plainText(160).optional(),
  description: z.array(plainText(1200)).max(6).default([]),

  location: z.object({
    beach: plainText(80).optional(),
    neighborhood: plainText(80).optional(),
    city: plainText(80),
    state: plainText(40),
    stateCode: z.string().length(2).toUpperCase(),
    /** Endereço completo — só preencher após confirmação do cliente. */
    streetAddress: plainText(160).optional(),
    postalCode: z
      .string()
      .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
      .optional(),
    mapsUrl: externalUrl('maps').optional(),
    /** Distância a pé até a praia, em metros (aproximada, confirmada). */
    beachDistanceM: z.number().int().positive().max(50_000).optional(),
    /** Tempo de caminhada até a praia, em minutos. */
    beachWalkMinutes: z.number().int().positive().max(240).optional(),
  }),

  /** Faixa de informações rápidas logo abaixo do hero. */
  quickFacts: z
    .array(z.object({ icon, label: plainText(60) }))
    .max(8)
    .default([]),

  highlights: z
    .array(
      z.object({
        title: plainText(80),
        text: plainText(300).optional(),
        icon: icon.optional(),
        /** Número de destaque (ex.: "250 m"); o primeiro item com stat vira destaque. */
        stat: plainText(16).optional(),
      }),
    )
    .max(8)
    .default([]),

  /**
   * Tour por ambiente. `photos` referencia `media.gallery[].src`; fotos que
   * não estiverem na galeria são ignoradas na exibição.
   */
  rooms: z
    .array(
      z.object({
        title: plainText(60),
        text: plainText(300).optional(),
        photos: z.array(photoSource).min(1).max(6),
      }),
    )
    .max(10)
    .default([]),

  experience: z
    .object({
      moments: z
        .array(
          z.object({
            time: plainText(20).optional(),
            title: plainText(80),
            text: plainText(300),
            photo: imageRef,
          }),
        )
        .max(6)
        .default([]),
      audiences: z
        .array(z.object({ icon, title: plainText(40), items: z.array(plainText(80)).max(4) }))
        .max(6)
        .default([]),
    })
    .default({ moments: [], audiences: [] }),

  /** Respostas rápidas para quem está decidindo (quartos, pets, crianças...). */
  essentials: z
    .array(
      z.object({
        icon,
        label: plainText(40),
        value: plainText(200),
        /** Em destaque: condições que mais pesam na decisão (pets, crianças). */
        featured: z.boolean().optional(),
      }),
    )
    .max(16)
    .default([]),

  region: z
    .object({
      places: z
        .array(
          z.object({
            name: plainText(60),
            distance: plainText(30).optional(),
            text: plainText(240).optional(),
            photo: creditedImage.optional(),
          }),
        )
        .max(10)
        .default([]),
    })
    .default({ places: [] }),

  faq: z
    .array(z.object({ question: plainText(160), answer: plainText(600) }))
    .max(20)
    .default([]),

  facts: z
    .object({
      areaM2: z.number().positive().max(2000).optional(),
      bedrooms: z.number().int().min(0).max(20).optional(),
      bathrooms: z.number().int().min(0).max(20).optional(),
      beds: plainText(160).optional(),
      maxGuests: z.number().int().min(1).max(40).optional(),
    })
    .default({}),

  amenities: z.array(plainText(80)).max(40).default([]),

  practicalInfo: z
    .object({
      checkIn: plainText(80).optional(),
      checkOut: plainText(80).optional(),
      houseRules: z.array(plainText(200)).max(20).default([]),
    })
    .default({ houseRules: [] }),

  booking: z
    .object({
      booking: externalUrl('booking').optional(),
      airbnb: externalUrl('airbnb').optional(),
      decolar: externalUrl('decolar').optional(),
    })
    .default({}),

  contact: z
    .object({
      instagram: externalUrl('instagram').optional(),
      whatsapp: externalUrl('whatsapp').optional(),
      email: z.email().optional(),
    })
    .default({}),

  media: z
    .object({
      hero: imageRef.optional(),
      /** Composição de fotos da apresentação (até 2). */
      intro: z.array(imageRef).max(2).default([]),
      /** Foto de apoio da seção de reservas. */
      booking: imageRef.optional(),
      gallery: z.array(galleryPhoto).max(60).default([]),
    })
    .default({ gallery: [], intro: [] }),
});

export type PropertyContent = z.infer<typeof propertySchema>;
export type PropertyContentInput = z.input<typeof propertySchema>;
