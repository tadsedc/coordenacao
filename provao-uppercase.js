/* Padroniza visualmente o nome do Provão sem alterar o valor usado pelas regras existentes. */
(function(){
  const regular='Avaliação Institucional - Provão';
  const uppercase='AVALIAÇÃO INSTITUCIONAL - PROVÃO';

  const modalBeforeProvaoUppercase=modal;
  modal=function(){
    return modalBeforeProvaoUppercase()
      .replaceAll('<option>'+regular+'</option>','<option value="'+regular+'">'+uppercase+'</option>');
  };

  const examCalendarBeforeProvaoUppercase=examCalendar;
  examCalendar=function(){
    return examCalendarBeforeProvaoUppercase.apply(this,arguments).replaceAll(regular,uppercase);
  };
})();
