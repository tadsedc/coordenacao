"""Gera apenas rascunhos semanais; não altera as aulas publicadas."""
import os
import uuid
import requests
from ortools.sat.python import cp_model


def solve(config):
    people = {p['id']: set(p['disponiveis']) for p in config['professores']}
    offers = config['ofertas']
    count = config['total_slots']
    if not offers or not 1 <= count <= 100:
        raise ValueError('Ofertas ou quantidade de blocos inválida.')
    model = cp_model.CpModel()
    variables = {}
    for i, offer in enumerate(offers):
        ead = offer.get('modalidade') == 'ead'
        if (not ead and offer.get('professor') not in people) or not offer['componentes']:
            raise ValueError('Professor ou componentes inválidos.')
        if not 1 <= offer['blocos'] <= count:
            raise ValueError('Quantidade de blocos inválida.')
        groups = [c['turma'] for c in offer['componentes']]
        if len(groups) != len(set(groups)):
            raise ValueError('Turma duplicada dentro da oferta conjunta.')
        for slot in range(count):
            variables[i, slot] = model.new_bool_var(f'a_{i}_{slot}')
            if not ead and slot not in people[offer['professor']]:
                model.add(variables[i, slot] == 0)
            if offer.get('modalidade') == 'ead' and slot not in (6, 7, 8, 9):
                model.add(variables[i, slot] == 0)
        model.add(sum(variables[i, s] for s in range(count)) == offer['blocos'])
    groups = {c['turma'] for o in offers for c in o['componentes']}
    for slot in range(count):
        for person in people:
            model.add(sum(variables[i, slot] for i, o in enumerate(offers)
                          if o.get('modalidade') != 'ead' and o.get('professor') == person) <= 1)
        for group in groups:
            model.add(sum(variables[i, slot] for i, o in enumerate(offers) if any(c['turma'] == group for c in o['componentes'])) <= 1)
    for person in config['professores']:
        limit = person.get('max_noites', (count + 1) // 2)
        if not isinstance(limit, int) or not 1 <= limit <= (count + 1) // 2:
            raise ValueError('Limite de noites inválido.')
        nights = []
        for day in range((count + 1) // 2):
            night = model.new_bool_var(f"noite_{person['id']}_{day}")
            assignments = [variables[i, slot] for i, offer in enumerate(offers)
                           if offer.get('modalidade') != 'ead' and offer.get('professor') == person['id']
                           for slot in range(day * 2, min(day * 2 + 2, count))]
            if assignments:
                model.add_max_equality(night, assignments)
            else:
                model.add(night == 0)
            nights.append(night)
        model.add(sum(nights) <= limit)
    model.minimize(sum(variables[i, slot] for i, offer in enumerate(offers)
                       if offer.get('modalidade') == 'ead'
                       for slot in (6, 7) if slot < count))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    solver.parameters.num_search_workers = 2
    status = solver.solve(model)
    if status == cp_model.INFEASIBLE:
        raise ValueError('Não existe horário com estas disponibilidades, cargas, limites de noites e turmas conjuntas. EAD exige quinta ou sexta-feira. Revise o planejamento.')
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise ValueError('Busca encerrada sem solução. Isso não comprova incompatibilidade das regras.')
    return {'aulas': [dict(oferta=o['id'], professor=None if o.get('modalidade') == 'ead' else o['professor'], componentes=o['componentes'], slot=s,
                            modalidade=o.get('modalidade', 'presencial'))
                      for i, o in enumerate(offers) for s in range(count) if solver.value(variables[i, s])],
            'status_solver': solver.status_name(status), 'rascunho': True}


def main():
    plan = str(uuid.UUID(os.environ['PLANEJAMENTO_ID']))
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/horario_planejamentos'
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
    def update(data):
        response = requests.patch(url, params={'id': 'eq.' + plan}, headers=headers, json=data, timeout=30)
        response.raise_for_status()
    response = requests.get(url, params={'id': 'eq.' + plan, 'select': '*'}, headers=headers, timeout=30)
    response.raise_for_status()
    rows = response.json()
    if len(rows) != 1:
        raise ValueError('Planejamento não encontrado.')
    if rows[0]['status'] != 'pendente':
        raise ValueError('Salve um novo planejamento para executar outra geração.')
    update({'status': 'processando', 'mensagem': 'Gerando rascunho.'})
    try:
        result = solve(rows[0]['configuracao'])
        update({'status': 'concluido', 'resultado': result, 'mensagem': 'Rascunho gerado. Revise antes de cadastrar as aulas.'})
    except Exception as error:
        update({'status': 'erro', 'mensagem': str(error)[:1000]})
        raise


if __name__ == '__main__':
    main()
