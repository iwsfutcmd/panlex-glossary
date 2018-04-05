import React, { Component } from 'react';
import './App.css';
import { query, getNormTranslations } from './api';
import { START_EXPRS, INITIAL_UIDDE, INITIAL_UIDAL, UID_NAMES } from "./constants";
import { FONT_NAMES, FONT_URLS } from "./fonts";
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

  getScript = uid => {
    return(this.state.uidCache[uid] && this.state.uidCache[uid].script_expr_txt);
  }

  cacheUids = uid => {
    return(query("/langvar", {uid, include: ["script_expr_txt"]}).then(r => {
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
        {[...(new Set(this.state.uids.map(uid => this.getScript(uid))))].map((script, i) => (
          <link key={i} href={FONT_URLS[script]} rel="stylesheet"/>
        ))}
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
                style={{fontFamily: `${FONT_NAMES[this.getScript(uid)]}, sans-serif`}}
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
