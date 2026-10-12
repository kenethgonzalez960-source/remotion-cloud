import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');
Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE ?? null);
