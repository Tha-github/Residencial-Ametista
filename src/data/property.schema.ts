import { z } from 'astro/zod';
import { defaultTheme, HEX, themeProblems } from '../lib/theme';
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

/** Identificador de ambiente do tour (ex.: "sala-cozinha"). */
const roomId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identificador inválido')
  .max(40);

const galleryPhoto = imageRef.extend({
  group: z.enum(galleryGroups).optional(),
  /** Ambiente do tour ao qual a foto pertence (rooms[].id). */
  room: roomId.optional(),
  /** Legenda exibida no modo ampliado — somente se fornecida/confirmada. */
  caption: plainText(140).optional(),
});

/**
 * Cabeçalho de seção editável: sobretítulo, título (aceita `*trecho*` para
 * itálico) e texto de apoio. Os padrões são os textos aprovados do site.
 */
const sectionText = (d: { eyebrow: string; title: string; lead?: string }) =>
  z
    .object({
      eyebrow: plainText(60),
      title: plainText(120),
      lead: plainText(400).optional(),
    })
    .prefault(d);

/** Destinos permitidos para os botões do hero (âncoras de seções existentes). */
export const heroTargets = [
  'reservas',
  'galeria',
  'apresentacao',
  'contato',
  'localizacao',
] as const;

const hexColor = z.string().regex(HEX, 'Use uma cor no formato #RRGGBB').toLowerCase();

export const propertySchema = z
  .object({
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
     * Ambientes do tour (atalhos e legendas do carrossel). Cada foto da
     * galeria aponta para o seu ambiente em `media.gallery[].room`.
     */
    rooms: z
      .array(
        z.object({
          id: roomId,
          title: plainText(60),
          text: plainText(300).optional(),
        }),
      )
      .max(10)
      .default([]),

    /** Textos dos botões do hero e para onde levam (somente seções existentes). */
    hero: z
      .object({
        primaryLabel: plainText(40),
        primaryTarget: z.enum(heroTargets),
        secondaryLabel: plainText(40),
        secondaryTarget: z.enum(heroTargets),
      })
      .prefault({
        primaryLabel: 'Ver opções de reserva',
        primaryTarget: 'reservas',
        secondaryLabel: 'Conhecer o apartamento',
        secondaryTarget: 'galeria',
      }),

    /** Cabeçalhos das seções. */
    sections: z
      .object({
        about: sectionText({ eyebrow: 'O apartamento', title: 'Conheça o *Residencial Ametista*' }),
        tour: sectionText({
          eyebrow: 'Tour pelo apartamento',
          title: 'Azul de mar em *cada canto*',
          lead: 'As paredes azuis, a luz natural e as almofadas de cor coral deixam o apartamento com cara de verão o ano todo. Escolha um ambiente e passeie por ele.',
        }),
        highlights: sectionText({
          eyebrow: 'Diferenciais',
          title: 'O que faz *diferença* na sua estadia',
          lead: 'Os detalhes que deixam a hospedagem mais prática, confortável e com cara de casa de praia.',
        }),
        experience: sectionText({
          eyebrow: 'Sugestão de roteiro',
          title: 'Um dia de férias no *Residencial Ametista*',
          lead: 'Uma ideia de como aproveitar cada momento da hospedagem, da manhã à noite.',
        }),
        amenities: sectionText({
          eyebrow: 'Estrutura e comodidades',
          title: 'Traga só a *mala de roupa*',
          lead: 'Roupa de cama e toalhas já estão lá esperando por você. E ainda tem cadeiras, guarda-sol e cooler para descer para a areia.',
        }),
        location: sectionText({
          eyebrow: 'Localização e região',
          title: 'Perto de tudo, *longe do barulho*',
          lead: 'Uma rua tranquila a poucos minutos da areia, no norte da Ilha de Santa Catarina. Ao redor, dunas, costões e algumas das praias mais bonitas de Florianópolis.',
        }),
        info: sectionText({
          eyebrow: 'Antes de reservar',
          title: 'Tudo o que você *precisa saber*',
          lead: 'As respostas que todo hóspede procura, num lugar só.',
        }),
        booking: sectionText({
          eyebrow: 'Reservas',
          title: 'Escolha suas datas e *reserve*',
          lead: 'O Residencial Ametista está anunciado nas plataformas abaixo. Consulte datas, valores e condições e conclua a reserva no site de sua preferência.',
        }),
        faq: sectionText({
          eyebrow: 'Dúvidas frequentes',
          title: 'Antes de *reservar*',
          lead: 'O essencial para planejar a viagem sem surpresas.',
        }),
        contact: sectionText({
          eyebrow: 'Reserva direta',
          title: 'Fale direto com o *proprietário*',
          lead: 'Prefere combinar tudo sem intermediários? Entre em contato para consultar datas, valores e tirar suas dúvidas.',
        }),
      })
      .prefault({}),

    /** Cores autorizadas (ver src/lib/theme.ts); contraste validado abaixo. */
    theme: z
      .object({
        primary: hexColor,
        secondary: hexColor,
        accent: hexColor,
        background: hexColor,
        text: hexColor,
      })
      .prefault(defaultTheme)
      .superRefine((theme, ctx) => {
        for (const message of themeProblems(theme)) ctx.addIssue({ code: 'custom', message });
      }),

    experience: z
      .object({
        moments: z
          .array(
            z.object({
              /** Momento do dia (ex.: "Manhã"). */
              time: plainText(20).optional(),
              icon: icon.optional(),
              title: plainText(80),
              text: plainText(300),
              photo: imageRef,
            }),
          )
          .max(6)
          .default([]),
      })
      .default({ moments: [] }),

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
        /** Início do texto dos botões: "Reservar no" + nome da plataforma. */
        buttonPrefix: plainText(30).default('Reservar no'),
      })
      .prefault({}),

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
  })
  .superRefine((c, ctx) => {
    // Toda foto do tour precisa apontar para um ambiente existente.
    const ids = new Set(c.rooms.map((r) => r.id));
    if (ids.size !== c.rooms.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['rooms'],
        message: 'Ambientes com identificador repetido',
      });
    }
    c.media.gallery.forEach((p, i) => {
      if (p.room && !ids.has(p.room)) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', 'gallery', i, 'room'],
          message: `Ambiente "${p.room}" não existe`,
        });
      }
    });
  });

export type PropertyContent = z.infer<typeof propertySchema>;
export type PropertyContentInput = z.input<typeof propertySchema>;
