import React, { Component } from 'react';
import './App.css';
import { query, getNormTranslations } from './api';
import { START_EXPRS, INITIAL_UIDDE, INITIAL_UIDAL, UID_NAMES } from "./constants";
import logo from './logo.png';

// const zip = (arr, ...arrs) => {
//   return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
// }

const compressExprs = exprs => {
  let exSet = exprs.reduce((exObj, ex) => {
    exObj[ex.txt] = (exObj[ex.txt] || 0) + ex.score;
    return(exObj);
  }, {});
  return(Object.entries(exSet).sort((a,b) => b[1] - a[1]).map(en => ({txt: en[0], score: en[1]})));
}

class App extends Component {
  constructor(props) {
    super(props);
    let uids = [...INITIAL_UIDDE, ...INITIAL_UIDAL];
    this.state = {
      // exprs: uids.reduce((exprs, uid, i) => {
      //   exprs[uid] = START_EXPRS.map(w => w[i] ? [{txt: w[i]}] : [{}]);
      //   return(exprs);
      // }, {}),
      meanings: START_EXPRS.map((_, i) => (
        uids.reduce((exprs, uid, j) => {
          exprs[uid] = START_EXPRS[i][j] ? [{txt: START_EXPRS[i][j]}] : [{}];
          return(exprs);
        }, {})
      )),
      newMeaning: {},
      uidDe: INITIAL_UIDDE,
      uidAl: INITIAL_UIDAL,
      uids: uids,
      uidCache: {},
      uidNames: UID_NAMES,
    };
  }
  
  getNormTranslations = getNormTranslations;
  compressExprs = compressExprs;

  componentDidMount() {
    this.cacheUids(this.state.uids).then(() => {
      this.populateAllMn();
    });
  }

  // populate = uidAl => {
  //   let exprs = this.state.exprs;
  //   let t = this.state.uidDe.map(uidDe => (
  //     getNormTranslations(exprs[uidDe].map(w => w[0].txt), this.getLvId(uidDe), this.getLvId(uidAl)).then(r => {
  //       let lvObj = {};
  //       let output = [];
  //       r.forEach(o => {if (!lvObj[o.trans_txt]) {lvObj[o.trans_txt] = []}; lvObj[o.trans_txt].push({txt: o.txt, score: o.norm_quality})})
  //       exprs[uidDe].forEach((e, i) => {
  //         // exprs[uidAl][i] = lvObj[e[0].txt] ? lvObj[e[0].txt] : [{}];
  //         output[i] = lvObj[e[0].txt] ? lvObj[e[0].txt] : [{}];
  //       });
  //       // this.setState({exprs});
  //       return(output);
  //     }))
  //   );
  //   Promise.all(t).then(r => {
  //     zip(...r).forEach((x, i) => {
  //       let exSet = {};
  //       x.forEach(y => {
  //         y.forEach(z => {
  //           if (z.txt && exSet[z.txt]) {
  //             exSet[z.txt] += z.score;
  //           } else if (z.txt) {
  //             exSet[z.txt] = z.score;
  //           }
  //         })
  //       })
  //       exprs[uidAl][i] = Object.entries(exSet).sort((a,b) => b[1] - a[1]).map(a => ({txt: a[0], score: a[1]}));
  //     });
  //     this.setState({exprs});
  //   });
  // }

  populateMn = meaningNum => {
    let meanings = this.state.meanings;
    let meaning = meanings[meaningNum];
    this.state.uidAl.forEach(uidAl => {
      meaning[uidAl] = [];
      let t = this.state.uidDe.map(uidDe => (
        meaning[uidDe][0].txt ?
          getNormTranslations(meaning[uidDe][0].txt, this.getLvId(uidDe), this.getLvId(uidAl)).then(r => {
            meaning[uidAl].push(...r.map(ex => ({txt: ex.txt, score: ex.norm_quality})));
          }) :
          Promise.resolve()
      ));
      Promise.all(t).then(() => {
        meaning[uidAl] = compressExprs(meaning[uidAl]);
        this.setState({meanings});
      })
    });
  }

  populateAllMn = () => {
    this.state.uidAl.forEach(uidAl => {
      let meanings = this.state.meanings;
      meanings.forEach(mn => mn[uidAl] = []);
      let t = this.state.uidDe.map(uidDe => {
        let meaningMap = new Map(meanings.map((mn, i) => [mn[uidDe][0].txt, i]));
        return(
          getNormTranslations(meanings.map(mn => mn[uidDe][0].txt), this.getLvId(uidDe), this.getLvId(uidAl)).then(r => {
            r.forEach(ex => {
              meanings[meaningMap.get(ex.trans_txt)][uidAl].push({txt: ex.txt, score: ex.norm_quality});
            });
          })
        );
      });
      Promise.all(t).then(() => {
        meanings.forEach(mn => {
          mn[uidAl] = compressExprs(mn[uidAl]);
        })
        this.setState({meanings});
      })
    })
  }

  getLvId = uid => {
    return(this.state.uidCache[uid].id);
  }

  cacheUids = uid => {
    return(query("/langvar", {uid}).then(r => {
      let uidCache = this.state.uidCache;
      r.result.forEach(lv => {
        uidCache[lv.uid] = lv;
      })
      this.setState({uidCache});
    }));
  }
  
  render() {
    return (
      <div className="App">
        <header>
          <a id="logo" href="https://panlex.org">
            <img src={logo} alt={this.props.panlexLabel}/>
          </a>
          <span>PanLex — Glossary</span>
        </header>
        <div className="trn-table" style={{gridTemplateColumns: `repeat(${this.state.uids.length}, 1fr)`}}>
          {this.state.uids.map((uid, uidIndex) => (
            <div key={uidIndex} className="trn-header">{this.state.uidNames[uid]}</div>
          ))}
          {this.state.meanings.map((meaning, mnIndex) => (
            this.state.uids.map((uid, uidIndex) => (
              <div 
                key={((mnIndex + 1) * this.state.uids.length) + uidIndex}
                className={uidIndex < this.state.uidDe.length ? "ex-de" : "ex-al"}
              >
                {meaning[uid][0] && meaning[uid][0].txt}
              </div>
            ))
          ))}
          {this.state.uidDe.map((uid, uidIndex) => (
            <input 
              key={(this.state.meanings.length + 1) * this.state.uids.length + uidIndex} 
              type="text" 
              // value={this.state.newMeaning[uid]}
              onInput={e => {
                let newMeaning = this.state.newMeaning;
                newMeaning[uid] = e.target.value;
                this.setState({newMeaning});
              }}
            />
          ))}
        </div>
        <input 
          type="button" 
          value="+" 
          onClick={e => {
            let meanings = this.state.meanings;
            meanings.push(this.state.uids.reduce((mn, uid) => {
              mn[uid] = [this.state.newMeaning[uid] ? {txt: this.state.newMeaning[uid]} : {}];
              return(mn);
            }, {}));
            this.setState({meanings, newMeaning: {}}, () => this.populateMn(meanings.length - 1));
          }}
        />
      </div>
    );
  }
}

export default App;
