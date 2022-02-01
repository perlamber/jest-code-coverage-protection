'use strict'

const { program } = require('commander');
const fs = require('fs')

const app = {
  run() {
    program
      .version('1.1.1')
      .description('Compare coverage-summary.json generated by jest')
      .option('-f, --file <filename>', 'The file generated by the (feature) branch you want to check', 'coverage/coverage-summary.json')
      .option('-c, --compare <filename>', 'The file generate by the (master) branch you want to compare against', 'master/coverage/coverage-summary.json')
      .option('-n, --new <threshold','The minimal threshold new code should have', '0.70')
      .option('-v, --variance <variance>','Allow for variance, e.g. allow 0.05 to allow a 5% decrease', '0')
    program.parse(process.argv);
    const options = program.opts();
    const files = {};

    ['file', 'compare'].forEach((key, index) => {
      try {
        files[key] = JSON.parse(fs.readFileSync(options[key]));
      } catch(err) {
        if('file' == key){
          if( err.message.indexOf("ENOENT: no such file or directory") != -1)
          {
            console.info(`No statistics to check at this time. ${options[key]} was not found.`);
            process.exit(0);  
          }
          console.error(err);
          process.exit(1);  
        }
        else{
          console.error(err);
          process.exit(1);
        }
      }
    })

    const {file, compare} = files;
    let exitCode = 0;
    const minCov = parseFloat(options.new*100);

    if (options.variance!='0') {
      console.log(`Allowed variance is ${options.variance}`);
    }

    Object.keys(file).forEach((mkey) => {
      if(mkey!='total'){
        ['lines','branches'].forEach((key) => {
          let compareEntry = compare[mkey];
          if(!compareEntry) {
            const pctNewDiff = parseFloat(file[mkey][key].pct).toFixed(2) + parseFloat(options.variance);
            if (parseFloat(pctNewDiff) < parseFloat(options.new)) {
              console.error(`Yikes, coverage for ${mkey} ${key} outside of limits, went from ${compareEntry[key].pct} to ${file[mkey][key].pct}`);
              exitCode = 1;
            }
          }
          else {
            const pctDiff = (compareEntry[key].pct - parseFloat(file[mkey][key].pct).toFixed(2));
            if (parseFloat(pctDiff) > parseFloat(options.variance)) {
              console.error(`Yikes, coverage for ${mkey} ${key} outside of limits, went from ${compareEntry[key].pct} to ${file[mkey][key].pct}`);
              exitCode = 1;
            }
            const totDiff = file[mkey][key].total - compare[mkey][key].total; // e.g. 20
            if (totDiff<1) {
              console.log(`Less or no ${key} changes, cannot determine coverage difference, skipping`);
            } 
            else {
              const coverageDiff = file[mkey][key].covered - compare[mkey][key].covered; // e.g. 18
              const newCoveragePct = parseFloat(coverageDiff / totDiff * 100);
              if (newCoveragePct < minCov) {
                console.error(`Yikes, coverage for ${mkey} ${key} outside of limits, new code coverage is ${newCoveragePct}, was expecting at least ${minCov}`);
                exitCode = 1;
              }
            }
          }
        });
      }  
    });
    console.info(`Coverage check is completed.`);
    process.exit(exitCode);
  }
}

module.exports = app;
