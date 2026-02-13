package ffprobe

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// MediaInfo holds the technical metadata extracted from a media file via ffprobe.
type MediaInfo struct {
	Duration        float64          `json:"duration"`
	Width           int              `json:"width"`
	Height          int              `json:"height"`
	VideoCodec      string           `json:"video_codec"`
	AudioCodec      string           `json:"audio_codec"`
	Bitrate         int64            `json:"bitrate"`
	FrameRate       string           `json:"frame_rate"`
	SubtitleStreams []SubtitleStream `json:"subtitle_streams"`
}

// SubtitleStream describes a single subtitle track within a media file.
type SubtitleStream struct {
	Index    int    `json:"index"`
	Language string `json:"language"`
	Title    string `json:"title"`
	Codec    string `json:"codec"`
	Forced   bool   `json:"forced"`
}

// ffprobeOutput mirrors the JSON structure returned by ffprobe.
type ffprobeOutput struct {
	Format  ffprobeFormat   `json:"format"`
	Streams []ffprobeStream `json:"streams"`
}

type ffprobeFormat struct {
	Duration string `json:"duration"`
	BitRate  string `json:"bit_rate"`
	Size     string `json:"size"`
}

type ffprobeStream struct {
	Index         int               `json:"index"`
	CodecName     string            `json:"codec_name"`
	CodecType     string            `json:"codec_type"`
	Width         int               `json:"width,omitempty"`
	Height        int               `json:"height,omitempty"`
	RFrameRate    string            `json:"r_frame_rate,omitempty"`
	AvgFrameRate  string            `json:"avg_frame_rate,omitempty"`
	Tags          map[string]string `json:"tags,omitempty"`
	Disposition   map[string]int    `json:"disposition,omitempty"`
}

// ProbeFile runs ffprobe on the given file and returns structured MediaInfo.
// It uses a 30-second timeout to prevent hangs on corrupt or inaccessible files.
func ProbeFile(filePath string) (*MediaInfo, error) {
	return ProbeFileWithContext(context.Background(), filePath)
}

// ProbeFileWithContext runs ffprobe with the supplied context for cancellation control.
func ProbeFileWithContext(ctx context.Context, filePath string) (*MediaInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("ffprobe timed out for %q", filePath)
		}
		return nil, fmt.Errorf("ffprobe failed for %q: %w", filePath, err)
	}

	var probe ffprobeOutput
	if err := json.Unmarshal(output, &probe); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe output for %q: %w", filePath, err)
	}

	return buildMediaInfo(&probe), nil
}

// buildMediaInfo converts raw ffprobe JSON output into a clean MediaInfo struct.
func buildMediaInfo(probe *ffprobeOutput) *MediaInfo {
	info := &MediaInfo{}

	// Parse duration from format.
	if probe.Format.Duration != "" {
		info.Duration, _ = strconv.ParseFloat(probe.Format.Duration, 64)
	}

	// Parse bitrate from format.
	if probe.Format.BitRate != "" {
		info.Bitrate, _ = strconv.ParseInt(probe.Format.BitRate, 10, 64)
	}

	// Walk streams to extract video, audio, and subtitle info.
	for _, stream := range probe.Streams {
		switch stream.CodecType {
		case "video":
			if info.VideoCodec == "" {
				info.VideoCodec = stream.CodecName
				info.Width = stream.Width
				info.Height = stream.Height
				info.FrameRate = normalizeFrameRate(stream.RFrameRate)
			}
		case "audio":
			if info.AudioCodec == "" {
				info.AudioCodec = stream.CodecName
			}
		case "subtitle":
			sub := SubtitleStream{
				Index:    stream.Index,
				Language: stream.Tags["language"],
				Title:    stream.Tags["title"],
				Codec:    stream.CodecName,
			}
			if stream.Disposition != nil && stream.Disposition["forced"] == 1 {
				sub.Forced = true
			}
			info.SubtitleStreams = append(info.SubtitleStreams, sub)
		}
	}

	return info
}

// normalizeFrameRate converts fractional frame rate strings (e.g. "24000/1001")
// into a human-readable form (e.g. "23.976").
func normalizeFrameRate(raw string) string {
	if raw == "" || raw == "0/0" {
		return ""
	}
	parts := strings.SplitN(raw, "/", 2)
	if len(parts) != 2 {
		return raw
	}
	num, err1 := strconv.ParseFloat(parts[0], 64)
	den, err2 := strconv.ParseFloat(parts[1], 64)
	if err1 != nil || err2 != nil || den == 0 {
		return raw
	}
	fps := num / den
	return fmt.Sprintf("%.3f", fps)
}
