# api-cep-map

API REST que recebe um CEP de origem e um raio em quilômetros e retorna todos os CEPs localizados dentro dessa área geográfica.

## Stack

- Node.js + NestJS + TypeScript
- Busca por raio com Haversine + bounding box (busca binária em memória)
- Telemetria assíncrona em NDJSON por requisição
- Frontend estático servido pelo próprio servidor

---

## Requisitos

- Node.js 18+
- npm 9+

---

## Instalação

```bash
git clone https://github.com/BrendonLee23/api-cep-map.git
cd api-cep-map
npm install
```

---

## Configurando a base de CEPs

A API depende de um arquivo `data/ceps.csv` com coordenadas geográficas por CEP.  
O arquivo não está versionado por conta do tamanho (88 MB), mas o ZIP já compilado está disponível no repositório.

**Opção 1 — Extrair o ZIP incluso (recomendado):**

```bash
# Linux / macOS
unzip data/ceps.zip -d data/

# Windows (PowerShell)
Expand-Archive data/ceps.zip -DestinationPath data/
```

**Opção 2 — Gerar manualmente a partir dos dados brutos:**

> Necessário apenas se quiser regenerar com dados mais recentes do [CEP Aberto](https://cepaberto.com/).

1. Baixe e extraia os dumps CSV por estado em `data/ceps/{UF}/`
2. Execute o script de build:

```bash
npm run build:dataset
```

O script baixa os centroides de municípios via API pública e distribui os CEPs geograficamente em espiral de Fibonacci ao redor do centroide de cada cidade, gerando `data/ceps.csv`.

**Formato esperado do arquivo** — veja `data/ceps.example.csv`:

```
cep,latitude,longitude,cidade,uf,bairro,logradouro
01001000,-23.532900,-46.639500,Sao Paulo,SP,Se,Praca da Se
```

---

## Executando o projeto

```bash
npm run dev
```

A API sobe na porta **3000**.  
O frontend HTML estará disponível em: [http://localhost:3000](http://localhost:3000)

---

## Testando o endpoint

### Via navegador

Acesse [http://localhost:3000](http://localhost:3000), informe um CEP e o raio em km.

### Via curl

```bash
# Busca CEPs num raio de 2 km a partir da Praça da Sé (SP)
curl "http://localhost:3000/cep/buscar?cep=01001000&raioKm=2"
```

### Resposta esperada

```json
{
  "origem": {
    "cep": "01001000",
    "latitude": -23.5329,
    "longitude": -46.6395,
    "cidade": "Sao Paulo",
    "uf": "SP",
    "bairro": "Se",
    "logradouro": "Praca da Se"
  },
  "resultados": ["01001000", "01001001", "01002000"],
  "total": 3
}
```

### Casos de erro

| Situação | HTTP | Mensagem |
|----------|------|----------|
| CEP com menos/mais de 8 dígitos | 400 | `CEP deve conter 8 digitos numericos` |
| CEP não encontrado na base | 404 | `CEP {cep} nao encontrado na base de dados` |
| `raioKm` ausente ou não numérico | 400 | `raioKm e obrigatorio e deve ser um numero` |
| `raioKm` negativo ou zero | 400 | `raioKm deve ser um numero positivo` |
| `raioKm` acima de 500 | 400 | `raioKm nao pode exceder 500 km` |

---

## Verificando a saúde da API

```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":42.3}
```

---

## Telemetria

Cada requisição gera automaticamente uma entrada NDJSON em `logs/telemetria.log`:

```json
{"timestamp":"2026-04-17T14:00:00.000Z","rota":"/cep/buscar","cep":"01001000","raioKm":2,"tempoMs":8.3,"memoriaHeapMb":512.4,"cpuUserMs":4.1,"cpuSistemaMs":0.8}
```

A pasta `logs/` é criada automaticamente na primeira execução.

---

## Executando os testes

```bash
# Testes unitários
npm test

# Testes unitários com cobertura
npm run test:cov

# Testes de integração (e2e)
npm run test:e2e
```
