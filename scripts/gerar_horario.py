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
        if offer['professor'] not in people or not offer['componentes']:
            raise ValueError('Professor ou componentes inválidos.')
        if not 1 <= offer['blocos'] <= count:
            raise ValueError('Quantidade de blocos inválida.')
        groups = [c['turma'] for c in offer['componentes']]
        if len(groups) != len(set(groups)):
            raise ValueError('Turma duplicada dentro da oferta conjunta.')
        for slot in range(count):
            variables[i, slot] = model.new_bool_var(f'a_{i}_{slot}')
            if slot not in people[offer['professor']]:
                model.add(variables[i, slot] == 0)
        model.add(sum(variables[i, s] for s in range(count)) == offer['blocos'])
    groups = {c['turma'] for o in offers for c in o['componentes']}
    for slot in range(count):
        for person in people:
            model.add(sum(variables[i, slot] for i, o in enumerate(offers) if o['professor'] == person) <= 1)
        for group in groups:
            model.add(sum(variables[i, slot] for i, o in enumerate(offers) if any(c['turma'] == group for c in o['componentes'])) <= 1)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    solver.parameters.num_search_workers = 2
    status = solver.solve(model)
    if status == cp_model.INFEASIBLE:
        raise ValueError('Não existe horário com estas disponibilidades, cargas e turmas conjuntas. Revise o planejamento.')
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise ValueError('Busca encerrada sem solução. Isso não comprova incompatibilidade das regras.')
    return {'aulas': [dict(oferta=o['id'], professor=o['professor'], componentes=o['componentes'], slot=s)
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
