import {Composition} from 'remotion';
import {Main} from './Main';
import {Collage, collageDefaults, COLLAGE_H, COLLAGE_W} from './collage/Collage';

export const Root = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={150} fps={30} width={1920} height={1080} />
    <Composition
      id="Collage"
      component={Collage}
      durationInFrames={1}
      fps={30}
      width={COLLAGE_W}
      height={COLLAGE_H}
      defaultProps={collageDefaults}
    />
  </>
);
