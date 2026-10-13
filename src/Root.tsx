import {Composition} from 'remotion';
import {Main} from './Main';

export const Root = () => (
  <Composition id="Main" component={Main} durationInFrames={150} fps={30} width={1920} height={1080} />
);
