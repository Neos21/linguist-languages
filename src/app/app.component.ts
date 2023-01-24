import { Component, OnInit } from '@angular/core';

import { parse } from 'yaml';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  /** 処理中か否か */
  public isLoading: boolean = true;
  /** 表示する言語一覧 */
  public languages: Array<any> | null = null;
  
  /** `languages.yaml` 総数 */
  public countAllLanguages     : number | null = null;
  /** `languages.yaml` のうちグループの子要素を除外した数 */
  public countGroupLanguages   : number | null = null;
  /** 習得済言語の総数 */
  public countLearnedLanguages : number | null = null;
  /** 習得済言語のうち独自言語の数 */
  public countOriginalLanguages: number | null = null;
  
  /** 初期表示時 */
  public async ngOnInit(): Promise<void> {
    const rawLanguages     = await this.fetchLanguages();
    const learnedLanguages = await this.fetchLeanedLanguages();
    const mergedLanguages = this.mergeLanguagesWithLearned(rawLanguages, learnedLanguages);
    this.languages = this.sortByColourLearned(mergedLanguages);
    this.isLoading = false;
  }
  
  /**
   * 言語一覧の YAML ファイルを変換して返す
   * 
   * @return 言語一覧の配列
   */
  private async fetchLanguages(): Promise<Array<any>> {
    const response = await fetch('/assets/languages.yaml');
    const responseText = await response.text();
    const rawLanguages = parse(responseText);
    
    const groupLanguages: Array<any> = [];  // グループに属する言語を退避させる
    const languages     : Array<any> = [];  // 言語一覧
    // 全言語を走査する
    Object.entries(rawLanguages).forEach(([name, info]: [string, any]) => {
      if(info.group == null ) return languages.push({ name, type: info.type, colour: info.color });  // グループがない言語
      if(name === info.group) return languages.push({ name, type: info.type, colour: info.color });  // グループ自体の言語は除外する
      return groupLanguages.push({ name, type: info.type, colour: info.color ?? null, parentLanguageName: info.group });  // グループ配下の言語
    });
    // 言語に `groupLanguages` をぶら下げていく
    groupLanguages.forEach((groupLanguage) => {
      const targetLanguage = languages.find((language) => language.name.toLowerCase() === groupLanguage.parentLanguageName.toLowerCase());  // `ECLiPSe` `Prolog` が不一致になるためケースを統一する
      if(targetLanguage == null) return console.warn(groupLanguage);
      if(targetLanguage.groupLanguages == null) targetLanguage.groupLanguages = [];
      targetLanguage.groupLanguages.push({ name: groupLanguage.name, type: groupLanguage.type, colour: groupLanguage.colour ?? null });
    });
    
    // 言語数カウント
    this.countAllLanguages   = Object.keys(rawLanguages).length;
    this.countGroupLanguages = languages.length;
    return languages;
  }
  
  /**
   * 習得済言語一覧の YAML を変換して返す
   * 
   * @return 習得済言語一覧
   */
  private async fetchLeanedLanguages(): Promise<Array<any>> {
    const response = await fetch('/assets/learned.yaml');
    const responseText = await response.text();
    const learnedLanguages = parse(responseText);
    return learnedLanguages;
  }
  
  /**
   * 全言語一覧に習得済言語をマージする
   * 
   * @param languages 全言語一覧
   * @param learnedLanguages 習得済言語一覧
   * @return マージした全言語一覧
   */
  private mergeLanguagesWithLearned(languages: Array<any>, learnedLanguages: Array<any>): Array<any> {
    learnedLanguages.forEach((learnedLanguage) => {
      const targetLanguage = languages.find((language => language.name === learnedLanguage.name));
      // 言語数カウント
      this.countLearnedLanguages = this.countLearnedLanguages == null ? 1 : this.countLearnedLanguages + 1;
      
      if(targetLanguage == null) {  // リストにない習得言語 : 独自言語
        languages.push({ ...learnedLanguage });
        // 言語数カウント
        this.countOriginalLanguages = this.countOriginalLanguages == null ? 1 : this.countOriginalLanguages + 1;
        return;
      }
      // 習得した言語の情報を追加する
      targetLanguage.url = learnedLanguage.url;
      if(learnedLanguage.originalExtends) targetLanguage.originalExtends = learnedLanguage.originalExtends;
    });
    return languages;
  }
  
  /**
   * 言語名のケースインセンシティブにソートする
   * 
   * @param languages 全言語一覧
   * @return 言語名でソートした全言語一覧
   */
  private sortByLanguageName(languages: Array<any>): Array<any> {
    return languages.sort((languageA, languageB) => {
      const languageNameA = languageA.name.toLowerCase();
      const languageNameB = languageB.name.toLowerCase();
      if(languageNameA < languageNameB) return -1;
      if(languageNameA > languageNameB) return  1;
      return 0;
    });
  }
  
  private sortByColourLearned(languages: Array<any>): Array<any> {
    return languages.sort((languageA, languageB) => {
      // 色定義：あり → なし
      const hasColourA = languageA.colour != null;
      const hasColourB = languageB.colour != null;
      if(hasColourA < hasColourB) return  1;
      if(hasColourA > hasColourB) return -1;
      // 習得：未済 → 済
      const isLearnedA = languageA.url != null;
      const isLearnedB = languageB.url != null;
      if(isLearnedA < isLearnedB) return -1;
      if(isLearnedA > isLearnedB) return  1;
      // 言語名
      const languageNameA = languageA.name.toLowerCase();
      const languageNameB = languageB.name.toLowerCase();
      if(languageNameA < languageNameB) return -1;
      if(languageNameA > languageNameB) return  1;
      return 0;
    });
  }
  
}
