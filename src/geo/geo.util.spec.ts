import { haversine, calcularBoundingBox } from './geo.util';

describe('haversine', () => {
  it('retorna zero para coordenadas identicas', () => {
    expect(haversine(-23.5329, -46.6395, -23.5329, -46.6395)).toBe(0);
  });

  it('calcula distancia aproximada entre dois pontos conhecidos', () => {
    const distancia = haversine(-23.5329, -46.6395, -22.9068, -43.1729);
    expect(distancia).toBeGreaterThan(350);
    expect(distancia).toBeLessThan(370);
  });

  it('e simetrico (A->B igual B->A)', () => {
    const ab = haversine(-23.5329, -46.6395, -22.9068, -43.1729);
    const ba = haversine(-22.9068, -43.1729, -23.5329, -46.6395);
    expect(ab).toBeCloseTo(ba, 5);
  });
});

describe('calcularBoundingBox', () => {
  it('retorna bounding box com dimensoes corretas para 10km', () => {
    const bbox = calcularBoundingBox(-23.5329, -46.6395, 10);
    expect(bbox.latMin).toBeLessThan(-23.5329);
    expect(bbox.latMax).toBeGreaterThan(-23.5329);
    expect(bbox.lngMin).toBeLessThan(-46.6395);
    expect(bbox.lngMax).toBeGreaterThan(-46.6395);
  });

  it('bounding box maior para raio maior', () => {
    const bbox5 = calcularBoundingBox(-23.5329, -46.6395, 5);
    const bbox20 = calcularBoundingBox(-23.5329, -46.6395, 20);
    expect(bbox20.latMax - bbox20.latMin).toBeGreaterThan(bbox5.latMax - bbox5.latMin);
  });

  it('ponto de origem esta dentro do bounding box', () => {
    const lat = -23.5329;
    const lng = -46.6395;
    const bbox = calcularBoundingBox(lat, lng, 5);
    expect(lat).toBeGreaterThanOrEqual(bbox.latMin);
    expect(lat).toBeLessThanOrEqual(bbox.latMax);
    expect(lng).toBeGreaterThanOrEqual(bbox.lngMin);
    expect(lng).toBeLessThanOrEqual(bbox.lngMax);
  });
});
