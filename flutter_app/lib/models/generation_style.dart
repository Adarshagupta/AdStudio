/// Matches web `defaultGenerationStyle` in src/lib/generation-client.ts
class GenerationStyle {
  static Map<String, dynamic> defaults({String aspectRatio = '9:16'}) => {
        'aspectRatio': aspectRatio,
        'captionStyle': 'Clean',
        'musicEnabled': true,
        'duration': 10,
        'resolution': '1080p',
        'outputType': 'video',
      };
}
