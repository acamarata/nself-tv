import Foundation
import AVFoundation
import React

@objc(VideoPlayerModule)
class VideoPlayerModule: NSObject {
  private var players: [String: AVPlayer] = [:]

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func initPlayer(_ streamUrl: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: streamUrl) else {
      reject("INVALID_URL", "Invalid stream URL", nil)
      return
    }

    let playerId = UUID().uuidString
    let player = AVPlayer(url: url)
    players[playerId] = player

    resolve(playerId)
  }

  @objc
  func play(_ playerId: String,
            resolver resolve: @escaping RCTPromiseResolveBlock,
            rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    player.play()
    resolve(nil)
  }

  @objc
  func pause(_ playerId: String,
             resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    player.pause()
    resolve(nil)
  }

  @objc
  func seek(_ playerId: String,
            position: NSNumber,
            resolver resolve: @escaping RCTPromiseResolveBlock,
            rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    let time = CMTime(seconds: position.doubleValue, preferredTimescale: 600)
    player.seek(to: time) { finished in
      if finished {
        resolve(nil)
      } else {
        reject("SEEK_FAILED", "Seek operation failed", nil)
      }
    }
  }

  @objc
  func getPosition(_ playerId: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    let position = CMTimeGetSeconds(player.currentTime())
    resolve(position)
  }

  @objc
  func getDuration(_ playerId: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId],
          let currentItem = player.currentItem else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    let duration = CMTimeGetSeconds(currentItem.duration)
    resolve(duration)
  }

  @objc
  func setPlaybackRate(_ playerId: String,
                       rate: NSNumber,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    player.rate = Float(truncating: rate)
    resolve(nil)
  }

  @objc
  func destroy(_ playerId: String,
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = players[playerId] else {
      reject("PLAYER_NOT_FOUND", "Player not found", nil)
      return
    }

    player.pause()
    players.removeValue(forKey: playerId)
    resolve(nil)
  }
}
