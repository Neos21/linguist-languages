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
  /** エラーメッセージ */
  public errorMessage: string = '';
  /** 表示する言語一覧 */
  public languages: Array<{ title: string; languages: Array<any>; }> | null = null;
  
  /** `languages.yaml` 総数 */
  public countAllLanguages     : number | null = null;
  /** `languages.yaml` のうちグループの子要素を除外した数 */
  public countGroupLanguages   : number | null = null;
  /** 習得済言語の総数 */
  public countLearnedLanguages : number | null = null;
  /** 習得済言語のうち独自言語の数 */
  public countOriginalLanguages: number | null = null;
  
  /** 全言語一覧を表示するかグルーピングした一覧を表示するか (デフォルトはグルーピングした一覧) */
  public isShownAllLanguages: boolean = false;
  
  /** 習得状況・カラー情報でグルーピングした一覧 */
  private sortedByColourLearnedLanguages: Array<{ title: string; languages: Array<any>; }> | null = null;
  /** 言語名でソートした一覧 */
  private sortedByAllLanguages: Array<{ title: string; languages: Array<any>; }> | null = null;
  
  /** 初期表示時 */
  public async ngOnInit(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      const rawAllLanguages  = await this.fetchAllLanguages();
      const learnedLanguages = await this.fetchLeanedLanguages();
      const coordinatedAllLanguages = this.coordinateAllLanguages(rawAllLanguages);
      const mergedLanguages = this.mergeLanguagesWithLearned(coordinatedAllLanguages, learnedLanguages);
      
      this.sortedByColourLearnedLanguages = this.sortByColourLearnedLanguages(mergedLanguages);
      this.sortedByAllLanguages           = this.sortByAllLanguages(mergedLanguages);
      this.languages = this.isShownAllLanguages ? this.sortedByAllLanguages : this.sortedByColourLearnedLanguages;  // どちらにも対応できるようにしておく
      
      this.isLoading = false;
    }
    catch(error: any) {
      console.error('ERROR :', error);
      this.isLoading = false;
      this.errorMessage = `ERROR : ${error.toString()}`;
    }
  }
  
  /** 言語一覧をトグル表示する */
  public toggleLanguages(): void {
    this.isShownAllLanguages = !this.isShownAllLanguages;
    this.languages = this.isShownAllLanguages ? this.sortedByAllLanguages : this.sortedByColourLearnedLanguages;
  }
  
  /**
   * 言語一覧の YAML ファイルを変換して返す
   * 
   * @return 言語一覧
   */
  private async fetchAllLanguages(): Promise<{ [key: string]: any; }> {
    const response = await fetch('assets/languages.yaml');
    const responseText = await response.text();
    const rawAllLanguages = parse(responseText);
    return rawAllLanguages;
  }
  
  /**
   * 習得済言語一覧の YAML を変換して返す
   * 
   * @return 習得済言語一覧
   */
  private async fetchLeanedLanguages(): Promise<Array<any>> {
    const response = await fetch('assets/learned.yaml');
    const responseText = await response.text();
    const learnedLanguages = parse(responseText);
    return learnedLanguages;
  }
  
  /**
   * 言語一覧を変換する
   * 
   * @param rawAllLanguages 言語一覧
   * @return 変換した言語一覧の配列
   */
  private coordinateAllLanguages(rawAllLanguages: { [key: string]: any; }): Array<any> {
    const allLanguages  : Array<any> = [];  // 言語一覧
    const groupLanguages: Array<any> = [];  // グループに属する言語を退避させる
    // 全言語を走査する
    Object.entries(rawAllLanguages).forEach(([name, info]: [string, any]) => {
      if(info.group == null ) return allLanguages.push({ name, type: info.type, colour: info.color });  // グループがない言語
      if(name === info.group) return allLanguages.push({ name, type: info.type, colour: info.color });  // グループ自体の言語は除外する
      return groupLanguages.push({ name, type: info.type, colour: info.color ?? null, parentLanguageName: info.group });  // グループ配下の言語
    });
    // 言語に `groupLanguages` をぶら下げていく
    groupLanguages.forEach((groupLanguage) => {
      const targetLanguage = allLanguages.find((language) => language.name.toLowerCase() === groupLanguage.parentLanguageName.toLowerCase());  // `ECLiPSe` `Prolog` が不一致になるためケースを統一する
      if(targetLanguage == null) return console.warn(groupLanguage);
      if(targetLanguage.groupLanguages == null) targetLanguage.groupLanguages = [];
      targetLanguage.groupLanguages.push({ name: groupLanguage.name, type: groupLanguage.type, colour: groupLanguage.colour ?? null });
    });
    
    // 言語数カウント
    this.countAllLanguages   = Object.keys(rawAllLanguages).length;
    this.countGroupLanguages = allLanguages.length;
    return allLanguages;
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
  
  /**
   * 言語一覧を習得状況・カラー情報で分類しソートする
   * 
   * @param languages 言語一覧
   * @returns 習得未済・習得済・カラー情報あり・なしの4グループに分類した言語一覧
   */
  private sortByColourLearnedLanguages(languages: Array<any>): Array<{ title: string; languages: Array<any>; }> {
    const hasColourNotLearned = languages.filter((language) => language.colour != null && language.url == null);
    const noColourNotLearned  = languages.filter((language) => language.colour == null && language.url == null);
    const hasColourLearned    = languages.filter((language) => language.colour != null && language.url != null);
    const noColourLearned     = languages.filter((language) => language.colour == null && language.url != null);
    return [
      { title: 'To Learn (Colours)'   , languages: this.sortByLanguageName(hasColourNotLearned) },
      { title: 'To Learn (No Colours)', languages: this.sortByLanguageName(noColourNotLearned ) },
      { title: 'Learned (Colours)'    , languages: this.sortByLanguageName(hasColourLearned   ) },
      { title: 'Learned (No Colours)' , languages: this.sortByLanguageName(noColourLearned    ) }
    ];
  }
  
  /**
   * 言語一覧を言語名でソートする
   * 
   * @param languages 言語一覧
   * @return 言語名でソートし単一グループにまとめた言語一覧
   */
  private sortByAllLanguages(languages: Array<any>): Array<{ title: string; languages: Array<any>; }> {
    return [{ title: 'All Languages', languages: this.sortByLanguageName(languages) }];
  }
}
