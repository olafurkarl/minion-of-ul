import { spawn } from "child_process";
import { middleAgeNations } from './nations';

export const hostGame = () => {
    const gameCmd = `/home/ostefansson/.steam/steam/steamapps/common/Dominions5/dom5_amd64`;
    const options = {
        era: 2,
        hallOfFameSize: 15,
        requiredAP: 8,
        tier1Thrones: 0,
        tier2Thrones: 7,
        tier3Thrones: 0,
        hours: 32,
        port: 4343,
        mapOptions: {
            randMap: 15,
            seaPart: 10,
            verticalWrap: true,
            horizontalWrap: true,
        },
        ai: [
            {
                name: 'Arcoscephale',
                difficulty: 'normai',
            },
            {
                name: 'Ermor',
                difficulty: 'normai',
            },
            {
                name: 'Mictlan',
                difficulty: 'normai',
            },
            {
                name: 'Rlyeh',
                difficulty: 'normai',
            },
            {
                name: 'Marignon',
                difficulty: 'normai',
            }
        ],
        mods: ['ImprovedCastingAIv1.04.dm'], // 'LucidThematicGemGenV163.dm', 'WH_6_25.dm', 'MA_Omniscience_v1_06.dm'
        gameName: 'testicles',
    }

    const args: Array<string> = [
        '-TS', 
        '--port', `${options.port}`,
        '--noclientstart', 
        '--renaming', 
        '--statusdump', 
        '--era', `${options.era}`,
        '--hofsize', `${options.hallOfFameSize}`,
        '--requiredap', `${options.requiredAP}`,
        '--thrones', `${options.tier1Thrones} ${options.tier2Thrones} ${options.tier3Thrones}`,
        '--hours', `${options.hours}`,
        '--randmap', `${options.mapOptions.randMap}`,
        '--seapart', `${options.mapOptions.seaPart}`  
    ];

    if (options.mapOptions.verticalWrap) {
        args.push('--vwrap')
    }
    if (!options.mapOptions.horizontalWrap) {
        args.push('--nohwrap');
    }
    if (options.ai.length > 0) {
        options.ai.forEach((ai) => {
            args.push(`--${ai.difficulty}`);

            // todo other eras>
            const nationID = middleAgeNations[`${ai.name}`];
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

    const child = spawn(gameCmd, args, { stdio: [process.stdin, process.stdout, process.stderr] });    
      
}