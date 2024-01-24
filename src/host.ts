import { spawn } from "child_process";
import { NationKey, earlyAgeNations, middleAgeNations } from "./nations";
import { MASTER_PASSWORD, SAVE_GAME_DIR } from "./env";
import * as fs from "fs";
import { addGame, games } from "./games";

type AIOptions = { name: string; difficulty: "normai" };

type GameOptions = {
  era: number;
  hallOfFameSize: number;
  requiredAP: number;
  tier1Thrones: number;
  tier2Thrones: number;
  tier3Thrones: number;
  hours: number;
  port: number;
  mapOptions: {
    randMap: number;
    seaPart: number;
    verticalWrap: boolean;
    horizontalWrap: boolean;
  };
  ai: Array<AIOptions>;
  gameName: string;
};

export const hostGame = (gameName: string, port: number) => {
  addGame({
    name: gameName,
    port,
    data: undefined,
  });
  const gameCmd =
    "/run/media/olik/Storage/SteamLibrary/steamapps/common/Dominions6/dom6_amd64";
  const options: GameOptions = {
    era: 1,
    hallOfFameSize: 15,
    requiredAP: 8,
    tier1Thrones: 0,
    tier2Thrones: 7,
    tier3Thrones: 0,
    hours: 32,
    port,
    mapOptions: {
      randMap: 15,
      seaPart: 10,
      verticalWrap: true,
      horizontalWrap: true,
    },
    ai: [],
    // mods: ['ImprovedCastingAIv1.04.dm'], // 'LucidThematicGemGenV163.dm', 'WH_6_25.dm', 'MA_Omniscience_v1_06.dm'
    gameName,
  };

  const args: Array<string> = [
    "-TS",
    "--port",
    `${options.port}`,
    "--noclientstart",
    "--renaming",
    "--statusdump",
    "--era",
    `${options.era}`,
    "--hofsize",
    `${options.hallOfFameSize}`,
    "--requiredap",
    `${options.requiredAP}`,
    "--thrones",
    `${options.tier1Thrones} ${options.tier2Thrones} ${options.tier3Thrones}`,
    "--hours",
    `${options.hours}`,
    "--randmap",
    `${options.mapOptions.randMap}`,
    "--seapart",
    `${options.mapOptions.seaPart}`,
    "--masterpass",
    `${MASTER_PASSWORD}`,
  ];

  if (options.mapOptions.verticalWrap) {
    args.push("--vwrap");
  }
  if (!options.mapOptions.horizontalWrap) {
    args.push("--nohwrap");
  }
  if (options.ai.length > 0) {
    options.ai.forEach((ai) => {
      args.push(`--${ai.difficulty}`);

      // todo other eras>
      const nationID = earlyAgeNations[`${ai.name}` as NationKey];
      args.push(`${nationID}`);
    });
  }
  // if (options.mods.length > 0) {
  //     options.mods.forEach((mod) => {
  //         args.push('-M');
  //         args.push(mod);
  //     });
  // }

  args.push(options.gameName);

  console.log("running game cmd", gameCmd, args);

  const child = spawn(gameCmd, args, {
    detached: true,
    stdio: ["ignore", "ignore", process.stderr],
  });
  child.unref();
};

export const startNextTurn = (game: string) => {
  const domCmdPath = `${SAVE_GAME_DIR}/${game}/domcmd`;
  fs.writeFile(domCmdPath, "settimeleft 5", (err) => {
    if (err) return console.log(err);
    console.log(domCmdPath);
  });
};
