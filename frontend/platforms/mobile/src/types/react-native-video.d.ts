declare module 'react-native-video' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface VideoProperties extends ViewProps {
    source: { uri: string } | number;
    paused?: boolean;
    resizeMode?: 'contain' | 'cover' | 'stretch';
    onLoad?: (data: any) => void;
    onProgress?: (data: any) => void;
    onError?: (error: any) => void;
    ref?: any;
  }

  export default class Video extends Component<VideoProperties> {}
}
