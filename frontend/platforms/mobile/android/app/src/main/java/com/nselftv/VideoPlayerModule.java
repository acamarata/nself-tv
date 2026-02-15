package com.nselftv;

import android.net.Uri;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.Player;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class VideoPlayerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "VideoPlayerModule";
    private final Map<String, ExoPlayer> players = new HashMap<>();
    private final ReactApplicationContext reactContext;

    public VideoPlayerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void initPlayer(String streamUrl, Promise promise) {
        try {
            String playerId = UUID.randomUUID().toString();

            ExoPlayer player = new ExoPlayer.Builder(reactContext).build();
            MediaItem mediaItem = MediaItem.fromUri(Uri.parse(streamUrl));
            player.setMediaItem(mediaItem);
            player.prepare();

            players.put(playerId, player);
            promise.resolve(playerId);
        } catch (Exception e) {
            promise.reject("INIT_FAILED", "Failed to initialize player", e);
        }
    }

    @ReactMethod
    public void play(String playerId, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            player.play();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("PLAY_FAILED", "Failed to play", e);
        }
    }

    @ReactMethod
    public void pause(String playerId, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            player.pause();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("PAUSE_FAILED", "Failed to pause", e);
        }
    }

    @ReactMethod
    public void seek(String playerId, double position, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            long positionMs = (long) (position * 1000);
            player.seekTo(positionMs);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("SEEK_FAILED", "Failed to seek", e);
        }
    }

    @ReactMethod
    public void getPosition(String playerId, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            double position = player.getCurrentPosition() / 1000.0;
            promise.resolve(position);
        } catch (Exception e) {
            promise.reject("GET_POSITION_FAILED", "Failed to get position", e);
        }
    }

    @ReactMethod
    public void getDuration(String playerId, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            double duration = player.getDuration() / 1000.0;
            promise.resolve(duration);
        } catch (Exception e) {
            promise.reject("GET_DURATION_FAILED", "Failed to get duration", e);
        }
    }

    @ReactMethod
    public void setPlaybackRate(String playerId, float rate, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            player.setPlaybackSpeed(rate);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("SET_RATE_FAILED", "Failed to set playback rate", e);
        }
    }

    @ReactMethod
    public void destroy(String playerId, Promise promise) {
        try {
            ExoPlayer player = players.get(playerId);
            if (player == null) {
                promise.reject("PLAYER_NOT_FOUND", "Player not found");
                return;
            }

            player.stop();
            player.release();
            players.remove(playerId);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("DESTROY_FAILED", "Failed to destroy player", e);
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        // Clean up all players
        for (ExoPlayer player : players.values()) {
            player.stop();
            player.release();
        }
        players.clear();
    }
}
