import fs from 'fs';
import path from 'path';

describe('PWA Manifest', () => {
  let manifest: any;

  beforeAll(() => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  });

  it('should have required fields', () => {
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('theme_color');
    expect(manifest).toHaveProperty('background_color');
  });

  it('should have correct display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('should have icons', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('should have icons with correct sizes', () => {
    const sizes = manifest.icons.map((icon: any) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('should have valid start URL', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('should have theme color', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should have background color', () => {
    expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should have shortcuts defined', () => {
    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
  });

  it('should have search and library shortcuts', () => {
    const shortcutNames = manifest.shortcuts.map((s: any) => s.name);
    expect(shortcutNames).toContain('Search');
    expect(shortcutNames).toContain('Library');
  });
});
