import { Composition } from 'remotion';
import { FamiliesLogo } from './FamiliesLogo';

export const Root = () => (
  <Composition
    id="FamiliesLogo"
    component={FamiliesLogo}
    durationInFrames={252}
    fps={60}
    width={2160}
    height={3840}
    defaultProps={{ motionBlur: true }}
  />
);
