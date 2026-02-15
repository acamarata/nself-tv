import { VideoPlayer } from './VideoPlayer';

describe('VideoPlayer', () => {
  let player: VideoPlayer;

  beforeEach(() => {
    player = new VideoPlayer();
  });

  it('should initialize successfully', async () => {
    await expect(player.initialize('http://example.com/video.mp4')).resolves.toBeUndefined();
  });

  it('should play successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    await expect(player.play()).resolves.toBeUndefined();
  });

  it('should pause successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    await expect(player.pause()).resolves.toBeUndefined();
  });

  it('should seek to position successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    await expect(player.seek(30)).resolves.toBeUndefined();
  });

  it('should get position successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    const position = await player.getPosition();
    expect(typeof position).toBe('number');
    expect(position).toBeGreaterThanOrEqual(0);
  });

  it('should get duration successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    const duration = await player.getDuration();
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should set playback rate successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    await expect(player.setPlaybackRate(1.5)).resolves.toBeUndefined();
  });

  it('should destroy successfully', async () => {
    await player.initialize('http://example.com/video.mp4');
    await expect(player.destroy()).resolves.toBeUndefined();
  });

  it('should throw error when playing without initialization', async () => {
    await expect(player.play()).rejects.toThrow('Player not initialized');
  });

  it('should throw error when pausing without initialization', async () => {
    await expect(player.pause()).rejects.toThrow('Player not initialized');
  });

  it('should throw error when seeking without initialization', async () => {
    await expect(player.seek(30)).rejects.toThrow('Player not initialized');
  });

  it('should throw error when getting position without initialization', async () => {
    await expect(player.getPosition()).rejects.toThrow('Player not initialized');
  });

  it('should throw error when getting duration without initialization', async () => {
    await expect(player.getDuration()).rejects.toThrow('Player not initialized');
  });

  it('should throw error when setting playback rate without initialization', async () => {
    await expect(player.setPlaybackRate(1.5)).rejects.toThrow('Player not initialized');
  });

  it('should throw error when destroying without initialization', async () => {
    await expect(player.destroy()).rejects.toThrow('Player not initialized');
  });
});
