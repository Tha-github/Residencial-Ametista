/**
 * Painel do Residencial Ametista — campos que o proprietário pode editar.
 * Descritor do Top Site Admin Kit (ver src/admin-kit/spec.ts): o que não
 * está listado aqui não pode ser alterado pelo painel (o servidor ignora).
 */
import { SELF, type Field, type Option, type SiteSpec } from '../admin-kit/spec';
import { contentIcons, heroTargets } from '../data/property.schema';
import { themeKeys, themeLabels } from '../lib/theme';

const iconLabels: Record<(typeof contentIcons)[number], string> = {
  waves: 'Ondas',
  footprints: 'Pegadas (caminhada)',
  flame: 'Chama (churrasqueira)',
  parking: 'Estacionamento',
  paw: 'Pata (pets)',
  snowflake: 'Floco (ar-condicionado)',
  wifi: 'Wi-Fi',
  home: 'Casa',
  utensils: 'Talheres (cozinha)',
  bed: 'Cama',
  bath: 'Banheira',
  area: 'Área',
  clock: 'Relógio',
  baby: 'Bebê',
  shirt: 'Camiseta (enxoval)',
  umbrella: 'Guarda-sol',
  tv: 'TV',
  washer: 'Máquina de lavar',
  users: 'Pessoas',
  heart: 'Coração',
  store: 'Comércio',
  sun: 'Sol',
  coffee: 'Café',
};
const icons: Option[] = contentIcons.map((value) => ({ value, label: iconLabels[value] }));

const targetLabels: Record<(typeof heroTargets)[number], string> = {
  reservas: 'Seção de reservas',
  galeria: 'Tour pelo apartamento',
  apresentacao: 'Apresentação',
  contato: 'Contato / reserva direta',
  localizacao: 'Localização',
};
const targets: Option[] = heroTargets.map((value) => ({ value, label: targetLabels[value] }));

const ITALIC_HELP = 'Para destacar em itálico, coloque o trecho entre asteriscos: *exemplo*.';

/** Sobretítulo + título + texto de uma seção (sections.<id>). */
const heading = (id: string, withLead = true): Field[] => [
  {
    key: `sections.${id}.eyebrow`,
    type: 'text',
    label: 'Sobretítulo (texto pequeno acima do título)',
    max: 60,
  },
  { key: `sections.${id}.title`, type: 'text', label: 'Título', max: 120, help: ITALIC_HELP },
  ...(withLead
    ? [
        {
          key: `sections.${id}.lead`,
          type: 'textarea',
          label: 'Descrição',
          max: 400,
          rows: 3,
          optional: true,
        } as Field,
      ]
    : []),
];

export const ametistaSpec: SiteSpec = {
  siteName: 'Residencial Ametista',
  siteUrl: 'https://tha-github.github.io/Residencial-Ametista/',
  contentPath: 'src/data/ametista.json',
  photosDir: 'src/assets/photos',
  uploadsSubdir: 'uploads',
  modules: [
    {
      id: 'inicio',
      title: 'Página inicial e banner',
      icon: 'home',
      description: 'A primeira tela do site: foto do banner, nome, frase e botões.',
      fields: [
        { key: 'media.hero', type: 'image', label: 'Foto do banner' },
        { key: 'name', type: 'text', label: 'Título principal', max: 80 },
        {
          key: 'location.beach',
          type: 'text',
          label: 'Subtítulo (praia, acima do título)',
          max: 80,
          help: 'Aparece junto da cidade, ex.: "Praia dos Ingleses · Florianópolis".',
        },
        { key: 'tagline', type: 'textarea', label: 'Texto descritivo', max: 160, rows: 2 },
        { key: 'hero.primaryLabel', type: 'text', label: 'Texto do botão principal', max: 40 },
        {
          key: 'hero.primaryTarget',
          type: 'select',
          label: 'Botão principal leva para',
          options: targets,
        },
        { key: 'hero.secondaryLabel', type: 'text', label: 'Texto do segundo botão', max: 40 },
        {
          key: 'hero.secondaryTarget',
          type: 'select',
          label: 'Segundo botão leva para',
          options: targets,
        },
        {
          key: 'quickFacts',
          type: 'list',
          label: 'Informações de destaque (faixa abaixo do banner)',
          mode: 'fixed',
          itemLabel: '{label}',
          item: [
            { key: 'icon', type: 'icon', label: 'Ícone', options: icons },
            { key: 'label', type: 'text', label: 'Texto', max: 60 },
          ],
        },
      ],
    },
    {
      id: 'apresentacao',
      title: 'Apresentação do apartamento',
      icon: 'text',
      description: 'Texto de apresentação e as duas fotos ao lado.',
      anchor: 'apresentacao',
      fields: [
        ...heading('about', false),
        {
          key: 'description',
          type: 'paragraphs',
          label: 'Descrição',
          max: 1200,
          maxItems: 4,
          help: 'Separe os parágrafos com uma linha em branco. O primeiro aparece em destaque.',
        },
        {
          key: 'media.intro',
          type: 'list',
          label: 'Fotos da apresentação',
          help: 'A primeira é a foto grande; a segunda, a menor sobreposta. Use as setas para trocar a ordem.',
          mode: 'sortable',
          identity: 'src',
          itemLabel: '{alt}',
          item: [{ key: SELF, type: 'image', label: 'Foto' }],
        },
      ],
    },
    {
      id: 'tour',
      title: 'Tour pelo apartamento',
      icon: 'images',
      description: 'Carrossel de fotos: trocar, reordenar, remover e adicionar fotos.',
      anchor: 'galeria',
      fields: [
        ...heading('tour'),
        {
          key: 'media.gallery',
          type: 'list',
          label: 'Fotos do carrossel',
          help: 'A ordem aqui é a ordem do carrossel. Limite de 20 fotos.',
          mode: 'editable',
          min: 1,
          max: 20,
          identity: 'src',
          itemLabel: '{alt}',
          newItem: { src: '', alt: '' },
          item: [
            { key: SELF, type: 'image', label: 'Foto' },
            {
              key: 'room',
              type: 'select',
              label: 'Ambiente',
              optional: true,
              optionsFrom: { path: 'rooms', value: 'id', label: 'title' },
              help: 'Aparece como legenda e atalho no carrossel.',
            },
            { key: 'caption', type: 'text', label: 'Legenda', max: 140, optional: true },
          ],
        },
      ],
    },
    {
      id: 'diferenciais',
      title: 'Diferenciais',
      icon: 'star',
      description: 'Os seis destaques do apartamento.',
      anchor: 'diferenciais',
      fields: [
        ...heading('highlights'),
        {
          key: 'highlights',
          type: 'list',
          label: 'Diferenciais',
          mode: 'fixed',
          itemLabel: '{title}',
          item: [
            { key: 'icon', type: 'icon', label: 'Ícone', options: icons },
            { key: 'title', type: 'text', label: 'Título', max: 80 },
            { key: 'text', type: 'textarea', label: 'Descrição', max: 300, rows: 2 },
          ],
        },
      ],
    },
    {
      id: 'experiencia',
      title: 'Experiência de hospedagem',
      icon: 'sun',
      description: 'Sugestão de roteiro: manhã, tarde e noite.',
      anchor: 'experiencia',
      fields: [
        ...heading('experience'),
        {
          key: 'experience.moments',
          type: 'list',
          label: 'Momentos do dia',
          mode: 'fixed',
          itemLabel: '{time}',
          item: [
            { key: 'time', type: 'text', label: 'Momento (ex.: Manhã)', max: 20 },
            { key: 'title', type: 'text', label: 'Título', max: 80 },
            { key: 'text', type: 'textarea', label: 'Texto', max: 300, rows: 3 },
            { key: 'photo', type: 'image', label: 'Foto' },
          ],
        },
      ],
    },
    {
      id: 'comodidades',
      title: 'Estrutura e comodidades',
      icon: 'list',
      description: 'Capacidade do apartamento e lista de comodidades.',
      anchor: 'comodidades',
      fields: [
        ...heading('amenities'),
        { key: 'facts.bedrooms', type: 'number', label: 'Quartos', min: 0, max: 20 },
        { key: 'facts.beds', type: 'text', label: 'Camas', max: 160 },
        { key: 'facts.bathrooms', type: 'number', label: 'Banheiros', min: 0, max: 20 },
        { key: 'facts.areaM2', type: 'number', label: 'Área', min: 1, max: 2000, suffix: 'm²' },
        {
          key: 'amenities',
          type: 'strings',
          label: 'Comodidades',
          mode: 'fixed',
          max: 80,
          itemLabel: 'Comodidade',
        },
      ],
    },
    {
      id: 'localizacao',
      title: 'Localização e região',
      icon: 'pin',
      description: 'Endereço, link do mapa e atrações próximas.',
      anchor: 'localizacao',
      fields: [
        ...heading('location'),
        { key: 'location.streetAddress', type: 'text', label: 'Rua e número', max: 160 },
        { key: 'location.neighborhood', type: 'text', label: 'Bairro', max: 80, optional: true },
        { key: 'location.city', type: 'text', label: 'Cidade', max: 80 },
        {
          key: 'location.postalCode',
          type: 'text',
          label: 'CEP',
          max: 9,
          placeholder: '00000-000',
          optional: true,
        },
        {
          key: 'location.mapsUrl',
          type: 'url',
          label: 'Link do Google Maps',
          help: 'No Google Maps, toque em "Compartilhar" e copie o link.',
        },
        {
          key: 'location.beachDistanceM',
          type: 'number',
          label: 'Distância até a praia',
          min: 1,
          max: 50000,
          suffix: 'metros',
          optional: true,
        },
        {
          key: 'location.beachWalkMinutes',
          type: 'number',
          label: 'Caminhada até a praia',
          min: 1,
          max: 240,
          suffix: 'minutos',
          optional: true,
        },
        {
          key: 'region.places',
          type: 'list',
          label: 'Atrações próximas',
          mode: 'fixed',
          itemLabel: '{name}',
          item: [
            { key: 'name', type: 'text', label: 'Nome', max: 60 },
            { key: 'distance', type: 'text', label: 'Distância', max: 30, optional: true },
            {
              key: 'text',
              type: 'textarea',
              label: 'Descrição',
              max: 240,
              rows: 2,
              optional: true,
            },
            { key: 'photo', type: 'image', label: 'Foto', credit: true, optional: true },
          ],
        },
      ],
    },
    {
      id: 'informacoes',
      title: 'Antes de reservar',
      icon: 'info',
      description: 'Horários, regras e condições da hospedagem.',
      anchor: 'informacoes',
      fields: [
        ...heading('info'),
        { key: 'practicalInfo.checkIn', type: 'text', label: 'Check-in', max: 80, optional: true },
        {
          key: 'practicalInfo.checkOut',
          type: 'text',
          label: 'Check-out',
          max: 80,
          optional: true,
          placeholder: 'Ex.: Até as 11h',
        },
        {
          key: 'essentials',
          type: 'list',
          label: 'Informações importantes (pets, crianças, quartos...)',
          mode: 'fixed',
          itemLabel: '{label}',
          item: [
            { key: 'label', type: 'text', label: 'Título', max: 40 },
            { key: 'value', type: 'textarea', label: 'Informação', max: 200, rows: 2 },
          ],
        },
        {
          key: 'practicalInfo.houseRules',
          type: 'strings',
          label: 'Regras da casa',
          mode: 'editable',
          max: 200,
          maxItems: 12,
          itemLabel: 'Regra',
        },
      ],
    },
    {
      id: 'duvidas',
      title: 'Dúvidas frequentes',
      icon: 'help',
      description: 'Perguntas e respostas.',
      anchor: 'duvidas',
      fields: [
        ...heading('faq'),
        {
          key: 'faq',
          type: 'list',
          label: 'Perguntas',
          mode: 'fixed',
          itemLabel: '{question}',
          item: [
            { key: 'question', type: 'text', label: 'Pergunta', max: 160 },
            { key: 'answer', type: 'textarea', label: 'Resposta', max: 600, rows: 3 },
          ],
        },
      ],
    },
    {
      id: 'reservas',
      title: 'Reservas e contatos',
      icon: 'calendar',
      description: 'Links do Booking e Airbnb, WhatsApp, e-mail e redes sociais.',
      anchor: 'reservas',
      fields: [
        ...heading('booking'),
        {
          key: 'booking.booking',
          type: 'url',
          label: 'Link do Booking.com',
          optional: true,
          placeholder: 'https://www.booking.com/hotel/...',
        },
        {
          key: 'booking.airbnb',
          type: 'url',
          label: 'Link do Airbnb',
          optional: true,
          placeholder: 'https://www.airbnb.com.br/rooms/...',
        },
        {
          key: 'booking.buttonPrefix',
          type: 'text',
          label: 'Texto dos botões de reserva',
          max: 30,
          help: 'Aparece antes do nome da plataforma, ex.: "Reservar no" Booking.com.',
        },
        { key: 'contact.whatsapp', type: 'whatsapp', label: 'WhatsApp', optional: true },
        { key: 'contact.email', type: 'email', label: 'E-mail de contato', optional: true },
        {
          key: 'contact.instagram',
          type: 'url',
          label: 'Instagram',
          optional: true,
          placeholder: 'https://www.instagram.com/seuperfil',
        },
        ...heading('contact'),
      ],
    },
    {
      id: 'cores',
      title: 'Cores do site',
      icon: 'palette',
      description: 'Cores autorizadas. Fontes, tamanhos e layout não mudam.',
      fields: themeKeys.map((k) => ({
        key: `theme.${k}`,
        type: 'color' as const,
        label: themeLabels[k].label,
        help: themeLabels[k].help,
      })),
    },
  ],
};
