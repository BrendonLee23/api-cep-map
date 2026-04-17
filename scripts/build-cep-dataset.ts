import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { parse } from 'csv-parse/sync';

interface MunicipioBrasil {
  nome: string;
  latitude: string;
  longitude: string;
  codigo_uf: string;
}

interface CidadeLocal {
  nome: string;
  siglaUF: string;
}

interface Coordenada {
  latitude: number;
  longitude: number;
}

interface RegistroCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidadeId: string;
}

const ANGULO_OURO = 2.3999632297286535;

const codigoUFparaSigla: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
  '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
  '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
  '52': 'GO', '53': 'DF',
};

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .toLowerCase()
    .trim();
}

function raioMaxPorQuantidade(n: number): number {
  if (n <= 50) return 1.5;
  if (n <= 200) return 3;
  if (n <= 1000) return 8;
  if (n <= 5000) return 15;
  return Math.min(20 + Math.sqrt(n / 5000) * 10, 35);
}

function distribuirEmEspiral(
  centroide: Coordenada,
  registros: RegistroCep[],
): Array<RegistroCep & Coordenada> {
  const n = registros.length;
  const raioMaxKm = raioMaxPorQuantidade(n);
  const cosLat = Math.cos((centroide.latitude * Math.PI) / 180);

  return registros.map((r, i) => {
    const theta = i * ANGULO_OURO;
    const raioKm = Math.sqrt(i / Math.max(n - 1, 1)) * raioMaxKm;
    const deltaLat = (raioKm * Math.cos(theta)) / 111.32;
    const deltaLng = (raioKm * Math.sin(theta)) / (111.32 * cosLat);
    return {
      ...r,
      latitude: centroide.latitude + deltaLat,
      longitude: centroide.longitude + deltaLng,
    };
  });
}

function buscarUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'api-cep-map-build/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          if (res.headers.location) {
            buscarUrl(res.headers.location).then(resolve).catch(reject);
          } else {
            reject(new Error('Redirecionamento sem Location header'));
          }
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ao buscar ${url}`));
          return;
        }
        const partes: Buffer[] = [];
        res.on('data', (chunk: Buffer) => partes.push(chunk));
        res.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function listarCsvsCep(pastaBase: string): string[] {
  return fs
    .readdirSync(pastaBase)
    .filter((entrada) => fs.statSync(path.join(pastaBase, entrada)).isDirectory())
    .flatMap((estado) => {
      const pastaEstado = path.join(pastaBase, estado);
      return fs
        .readdirSync(pastaEstado)
        .filter((arq) => arq.endsWith('.csv'))
        .map((arq) => path.join(pastaEstado, arq));
    });
}

function limparCampo(v: string): string {
  return v.replace(/"/g, '').replace(/[\r\n]/g, ' ').trim();
}

async function main(): Promise<void> {
  const raiz = path.resolve(__dirname, '..');

  const conteudoEstados = fs.readFileSync(path.join(raiz, 'data', 'states.csv'), 'utf8');
  const mapaEstados = new Map<string, string>();
  for (const linha of conteudoEstados.trim().split('\n')) {
    const partes = linha.split(',');
    if (partes.length >= 3) {
      mapaEstados.set(partes[0].trim(), partes[2].trim().toUpperCase());
    }
  }

  const conteudoCidades = fs.readFileSync(path.join(raiz, 'data', 'cities.csv'), 'utf8');
  const mapaCidades = new Map<string, CidadeLocal>();
  for (const linha of conteudoCidades.trim().split('\n')) {
    const partes = linha.trim().split(',');
    if (partes.length < 3) continue;
    const id = partes[0].trim();
    const estadoId = partes[partes.length - 1].trim();
    const nome = partes.slice(1, partes.length - 1).join(',').trim();
    const siglaUF = mapaEstados.get(estadoId) ?? '';
    mapaCidades.set(id, { nome, siglaUF });
  }

  process.stdout.write('Baixando municipios-brasileiros...\n');
  const urlMunicipios =
    'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';
  const conteudoMunicipios = await buscarUrl(urlMunicipios);

  const municipios = parse(conteudoMunicipios, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MunicipioBrasil[];

  const mapaCoordenadas = new Map<string, Coordenada>();
  for (const m of municipios) {
    const siglaUF = codigoUFparaSigla[String(m.codigo_uf)];
    if (!siglaUF) continue;
    const lat = parseFloat(m.latitude);
    const lng = parseFloat(m.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;
    const chave = `${normalizarNome(m.nome)}|${siglaUF}`;
    mapaCoordenadas.set(chave, { latitude: lat, longitude: lng });
  }

  const pastaCeps = path.join(raiz, 'data', 'ceps');
  const listaCsvs = listarCsvsCep(pastaCeps);
  process.stdout.write(`Lendo ${listaCsvs.length} arquivos CSV...\n`);

  const grupoPorCidade = new Map<string, RegistroCep[]>();
  const vistos = new Set<string>();

  for (const csvPath of listaCsvs) {
    const buffer = fs.readFileSync(csvPath);
    const registros = parse(buffer, {
      skip_empty_lines: true,
      relax_column_count: true,
    }) as string[][];

    for (const campos of registros) {
      if (campos.length < 6) continue;
      const cep = campos[0].replace(/\D/g, '');
      if (!cep || vistos.has(cep)) continue;
      const cidadeId = campos[4].trim();
      const cidade = mapaCidades.get(cidadeId);
      if (!cidade || !cidade.siglaUF) continue;
      const chave = `${normalizarNome(cidade.nome)}|${cidade.siglaUF}`;
      if (!mapaCoordenadas.has(chave)) continue;
      vistos.add(cep);
      if (!grupoPorCidade.has(chave)) grupoPorCidade.set(chave, []);
      grupoPorCidade.get(chave)!.push({
        cep,
        logradouro: limparCampo(campos[1] ?? ''),
        bairro: limparCampo(campos[3] ?? ''),
        cidadeId,
      });
    }
  }

  process.stdout.write(`Distribuindo coordenadas em espiral para ${grupoPorCidade.size} cidades...\n`);

  const caminhoCepsCsv = path.join(raiz, 'data', 'ceps.csv');
  const saida = fs.createWriteStream(caminhoCepsCsv, { encoding: 'utf8' });
  saida.write('cep,latitude,longitude,cidade,uf,bairro,logradouro\n');

  let totalGravados = 0;

  for (const [chave, registrosCidade] of grupoPorCidade) {
    const centroide = mapaCoordenadas.get(chave)!;
    const cidadeId = registrosCidade[0].cidadeId;
    const cidadeLocal = mapaCidades.get(cidadeId)!;
    const nomeCidade = limparCampo(cidadeLocal.nome.replace(/\s*\(.*?\)\s*/g, ''));
    const uf = cidadeLocal.siglaUF;

    const distribuidos = distribuirEmEspiral(centroide, registrosCidade);

    for (const d of distribuidos) {
      saida.write(
        `${d.cep},${d.latitude.toFixed(6)},${d.longitude.toFixed(6)},${nomeCidade},${uf},${d.bairro},${d.logradouro}\n`,
      );
      totalGravados++;
    }
  }

  await new Promise<void>((resolve) => saida.end(resolve));
  process.stdout.write(`Concluido: ${totalGravados} CEPs gravados em data/ceps.csv\n`);
}

main().catch((err: Error) => {
  process.stderr.write(`Erro: ${err.message}\n`);
  process.exit(1);
});
